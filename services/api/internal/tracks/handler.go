package tracks

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

func (h *Handler) Create(c *gin.Context) {
	fileHeader, err := c.FormFile("audio")
	if err != nil {
		if httpx.IsBodyTooLarge(err) {
			httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "file too large")
			return
		}
		httpx.BadRequest(c, "audio file is required (multipart field: audio)")
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		httpx.BadRequest(c, "cannot read audio file")
		return
	}
	defer f.Close()

	slugs := httpx.SplitCSV(c.PostForm("artist_slugs"))
	if len(slugs) == 0 {
		slugs = c.PostFormArray("artist_slugs")
	}
	tags := httpx.SplitCSV(c.PostForm("tags"))
	if len(tags) == 0 {
		tags = c.PostFormArray("tags")
	}

	uid := httpx.UserID(c)
	track, err := h.svc.Create(c.Request.Context(), UploadInput{
		UploaderID:  uid,
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),
		ArtistSlugs: slugs,
		Tags:        tags,
		File:        f,
		FileSize:    fileHeader.Size,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"track": track})
}

func (h *Handler) Get(c *gin.Context) {
	track, err := h.svc.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"track": track})
}

func (h *Handler) ListByArtist(c *gin.Context) {
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

	res, err := h.svc.ListByArtistSlug(c.Request.Context(), c.Param("slug"), limit, offset)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) ListByUploader(c *gin.Context) {
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

	res, err := h.svc.ListByUploaderHandle(c.Request.Context(), c.Param("handle"), limit, offset)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) ListProducers(c *gin.Context) {
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

	res, err := h.svc.ListProducers(c.Request.Context(), limit, offset)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) Withdraw(c *gin.Context) {
	uid := httpx.UserID(c)
	if err := h.svc.Withdraw(c.Request.Context(), c.Param("id"), uid); err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) StreamAudio(c *gin.Context) {
	f, contentType, err := h.svc.OpenAudio(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.mapError(c, err)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		httpx.Internal(c)
		return
	}
	c.Header("Content-Type", contentType)
	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "private, max-age=3600")
	http.ServeContent(c.Writer, c.Request, stat.Name(), stat.ModTime(), f)
}

func (h *Handler) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
	case errors.Is(err, ErrNotFound):
		httpx.NotFound(c, "not found")
	case errors.Is(err, ErrForbidden):
		httpx.Forbidden(c, "forbidden")
	case errors.Is(err, ErrRateLimit):
		httpx.JSONError(c, http.StatusTooManyRequests, "rate_limited", "daily upload limit reached")
	default:
		if dberr.IsInvalidSyntax(err) || errors.Is(err, dberr.ErrInvalidID) {
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
