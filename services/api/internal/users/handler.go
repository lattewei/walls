package users

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/httpx"
)

// Same key as auth.ContextUserID — kept local to avoid import cycles.
const contextUserID = "auth_user_id"

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
		httpx.BadRequest(c, "avatar file is required (multipart field: avatar)")
		return
	}
	f, err := fh.Open()
	if err != nil {
		httpx.BadRequest(c, "cannot read avatar file")
		return
	}
	defer f.Close()

	uid, _ := c.Get(contextUserID)
	userID, _ := uid.(string)
	user, err := h.svc.UploadAvatar(c.Request.Context(), userID, f, fh.Size)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "unsupported") || strings.Contains(msg, "too large") || strings.Contains(msg, "required") {
			httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
			return
		}
		if errors.Is(err, ErrNotFound) {
			httpx.Unauthorized(c, "authentication required")
			return
		}
		httpx.Internal(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}
