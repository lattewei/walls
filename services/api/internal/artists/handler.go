package artists

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/auth"
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
	uid := auth.UserIDFromContext(c)
	ct := c.ContentType()

	var in CreateArtistInput
	in.CreatedBy = uid

	if strings.HasPrefix(ct, "multipart/form-data") {
		in.Name = c.PostForm("name")
		in.Slug = c.PostForm("slug")
		in.Bio = c.PostForm("bio")
		in.LookingFor = c.PostForm("looking_for")
		in.Genres = splitCSV(c.PostForm("genres"))
		if len(in.Genres) == 0 {
			in.Genres = c.PostFormArray("genres")
		}

		if fh, err := c.FormFile("cover"); err == nil && fh != nil {
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
		UserID:             auth.UserIDFromContext(c),
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
	limit, _ := parseNonNegInt(c.Query("limit"), 0)
	offset, _ := parseNonNegInt(c.Query("offset"), 0)
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
	cl, err := h.svc.ReviewClaim(c.Request.Context(), c.Param("id"), auth.UserIDFromContext(c), req.Status)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"claim": cl})
}

func (h *Handler) List(c *gin.Context) {
	limit, err := parseNonNegInt(c.Query("limit"), 0)
	if err != nil {
		httpx.BadRequest(c, "invalid limit")
		return
	}
	offset, err := parseNonNegInt(c.Query("offset"), 0)
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

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parseNonNegInt(raw string, fallback int) (int, error) {
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	if n < 0 {
		return 0, strconv.ErrRange
	}
	return n, nil
}

func (h *Handler) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
	case errors.Is(err, ErrConflict):
		msg := strings.TrimPrefix(err.Error(), ErrConflict.Error()+": ")
		httpx.JSONError(c, http.StatusConflict, "conflict", msg)
	case errors.Is(err, ErrNotFound):
		httpx.NotFound(c, "artist not found")
	default:
		httpx.Internal(c)
	}
}
