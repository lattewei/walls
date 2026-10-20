package moderation

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/auth"
	"github.com/lattewei/walls/services/api/internal/httpx"
	"github.com/lattewei/walls/services/api/internal/tracks"
)

type Handler struct {
	svc    *Service
	tracks *tracks.Service
}

func NewHandler(svc *Service, trackSvc *tracks.Service) *Handler {
	return &Handler{svc: svc, tracks: trackSvc}
}

func (h *Handler) CreateReport(c *gin.Context) {
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   string `json:"target_id"`
		Reason     string `json:"reason"`
		Details    string `json:"details"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}
	uid := auth.UserIDFromContext(c)
	rep, err := h.svc.Create(c.Request.Context(), uid, req.TargetType, req.TargetID, req.Reason, req.Details)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"report": rep})
}

func (h *Handler) ListReports(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	items, total, err := h.svc.List(c.Request.Context(), c.Query("status"), limit, offset)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reports": items, "total": total})
}

func (h *Handler) UpdateReport(c *gin.Context) {
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}
	rep, err := h.svc.UpdateStatus(c.Request.Context(), c.Param("id"), req.Status, auth.UserIDFromContext(c))
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"report": rep})
}

func (h *Handler) HideTrack(c *gin.Context) {
	if err := h.tracks.Hide(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, tracks.ErrNotFound) {
			httpx.NotFound(c, "track not found")
			return
		}
		httpx.Internal(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
	case errors.Is(err, ErrNotFound):
		httpx.NotFound(c, "report not found")
	default:
		httpx.Internal(c)
	}
}
