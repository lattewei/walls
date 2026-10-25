package artists

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/dberr"
	"github.com/lattewei/walls/services/api/internal/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type createRequest struct {
	Name       string   `json:"name"`
	Slug       string   `json:"slug"`
	Bio        string   `json:"bio"`
	Genres     []string `json:"genres"`
	LookingFor string   `json:"looking_for"`
}

func (h *Handler) Create(c *gin.Context) {
	uid := httpx.UserID(c)
	ct := c.ContentType()

	var in CreateArtistInput
	in.CreatedBy = uid

	if strings.HasPrefix(ct, "multipart/form-data") {
		in.Name = c.PostForm("name")
		in.Slug = c.PostForm("slug")
		in.Bio = c.PostForm("bio")
		in.LookingFor = c.PostForm("looking_for")
		in.Genres = httpx.SplitCSV(c.PostForm("genres"))
		if len(in.Genres) == 0 {
			in.Genres = c.PostFormArray("genres")
		}

		if fh, err := c.FormFile("cover"); err != nil {
			if httpx.IsBodyTooLarge(err) {
				httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "file too large")
				return
			}
		} else if fh != nil {
			f, err := fh.Open()
			if err != nil {
				httpx.BadRequest(c, "cannot read cover image")
				return
			}
			defer f.Close()
			in.Cover = f
			in.CoverSize = fh.Size
		}
	} else {
		var req createRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			httpx.BadRequest(c, "invalid JSON body")
			return
		}
		in.Name = req.Name
		in.Slug = req.Slug
		in.Bio = req.Bio
		in.Genres = req.Genres
		in.LookingFor = req.LookingFor
	}

	artist, err := h.svc.Create(c.Request.Context(), in)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"artist": artist})
}

func (h *Handler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	artist, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if errors.Is(err, ErrNotFound) {
		httpx.NotFound(c, "artist not found")
		return
	}
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"artist": artist})
}

func (h *Handler) Update(c *gin.Context) {
	in := UpdateArtistInput{
		Slug:      c.Param("slug"),
		ActorID:   httpx.UserID(c),
		ActorRole: httpx.Role(c),
	}
	ct := c.ContentType()
	if strings.HasPrefix(ct, "multipart/form-data") {
		if v, ok := c.GetPostForm("name"); ok {
			in.Name = &v
		}
		if v, ok := c.GetPostForm("bio"); ok {
			in.Bio = &v
		}
		if v, ok := c.GetPostForm("looking_for"); ok {
			in.LookingFor = &v
		}
		if v, ok := c.GetPostForm("genres"); ok {
			g := httpx.SplitCSV(v)
			in.Genres = &g
		} else if arr := c.PostFormArray("genres"); len(arr) > 0 {
			in.Genres = &arr
		}
		if fh, err := c.FormFile("cover"); err != nil {
			if httpx.IsBodyTooLarge(err) {
				httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "file too large")
				return
			}
		} else if fh != nil {
			f, err := fh.Open()
			if err != nil {
				httpx.BadRequest(c, "cannot read cover image")
				return
			}
			defer f.Close()
			in.Cover = f
			in.CoverSize = fh.Size
		}
	} else {
		var req struct {
			Name       *string   `json:"name"`
			Bio        *string   `json:"bio"`
			Genres     *[]string `json:"genres"`
			LookingFor *string   `json:"looking_for"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			httpx.BadRequest(c, "invalid JSON body")
			return
		}
		in.Name = req.Name
		in.Bio = req.Bio
		in.Genres = req.Genres
		in.LookingFor = req.LookingFor
	}

	artist, err := h.svc.Update(c.Request.Context(), in)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"artist": artist})
}

func (h *Handler) RequestClaim(c *gin.Context) {
	var req struct {
		VerificationMethod string `json:"verification_method"`
		ProofURL           string `json:"proof_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}
	cl, err := h.svc.RequestClaim(c.Request.Context(), ClaimInput{
		Slug:               c.Param("slug"),
		UserID:             httpx.UserID(c),
		VerificationMethod: req.VerificationMethod,
		ProofURL:           req.ProofURL,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"claim": cl})
}

func (h *Handler) ListPendingClaims(c *gin.Context) {
	limit, err := httpx.ParseNonNegInt(c.Query("limit"), 0)
	if err != nil {
		httpx.BadRequest(c, "invalid limit")
		return
	}
	offset, err := httpx.ParseNonNegInt(c.Query("offset"), 0)
	if err != nil {
		httpx.BadRequest(c, "invalid offset")
		return
	}
	items, total, err := h.svc.ListPendingClaims(c.Request.Context(), limit, offset)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"claims": items, "total": total, "limit": limit, "offset": offset})
}

func (h *Handler) ReviewClaim(c *gin.Context) {
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}
	cl, err := h.svc.ReviewClaim(c.Request.Context(), c.Param("id"), httpx.UserID(c), req.Status)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"claim": cl})
}

func (h *Handler) List(c *gin.Context) {
	limit, err := httpx.ParseNonNegInt(c.Query("limit"), 0)
	if err != nil {
		httpx.BadRequest(c, "invalid limit")
		return
	}
	offset, err := httpx.ParseNonNegInt(c.Query("offset"), 0)
	if err != nil {
		httpx.BadRequest(c, "invalid offset")
		return
	}

	res, err := h.svc.List(c.Request.Context(), ListInput{
		Query:  c.Query("q"),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
	case errors.Is(err, ErrConflict):
		msg := strings.TrimPrefix(err.Error(), ErrConflict.Error()+": ")
		httpx.JSONError(c, http.StatusConflict, "conflict", msg)
	case errors.Is(err, ErrForbidden):
		httpx.Forbidden(c, "forbidden")
	case errors.Is(err, ErrNotFound):
		httpx.NotFound(c, "artist not found")
	default:
		if dberr.IsInvalidSyntax(err) {
			httpx.BadRequest(c, "invalid id")
			return
		}
		if httpx.IsBodyTooLarge(err) {
			httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "file too large")
			return
		}
		httpx.Internal(c)
	}
}
