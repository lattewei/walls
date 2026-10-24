package users

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/dberr"
	"github.com/lattewei/walls/services/api/internal/httpx"
	"github.com/lattewei/walls/services/api/internal/media"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetByHandle(c *gin.Context) {
	handle := c.Param("handle")
	profile, err := h.svc.GetPublicProfile(c.Request.Context(), handle)
	if errors.Is(err, ErrNotFound) {
		httpx.NotFound(c, "user not found")
		return
	}
	if err != nil {
		httpx.Internal(c)
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *Handler) UploadAvatar(c *gin.Context) {
	fh, err := c.FormFile("avatar")
	if err != nil {
		if httpx.IsBodyTooLarge(err) {
			httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "file too large")
			return
		}
		httpx.BadRequest(c, "avatar file is required (multipart field: avatar)")
		return
	}
	f, err := fh.Open()
	if err != nil {
		httpx.BadRequest(c, "cannot read avatar file")
		return
	}
	defer f.Close()

	user, err := h.svc.UploadAvatar(c.Request.Context(), httpx.UserID(c), f, fh.Size)
	if err != nil {
		switch {
		case errors.Is(err, media.ErrUnsupported):
			httpx.JSONError(c, http.StatusBadRequest, "validation_error", "unsupported image type")
		case errors.Is(err, media.ErrTooLarge):
			httpx.JSONError(c, http.StatusRequestEntityTooLarge, "validation_error", "avatar image is too large (max 5MB)")
		case errors.Is(err, ErrAvatarRequired):
			httpx.JSONError(c, http.StatusBadRequest, "validation_error", "avatar file is required")
		case errors.Is(err, ErrNotFound):
			httpx.Unauthorized(c, "authentication required")
		case dberr.IsInvalidSyntax(err):
			httpx.BadRequest(c, "invalid id")
		default:
			httpx.Internal(c)
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}
