package users

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/httpx"
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
