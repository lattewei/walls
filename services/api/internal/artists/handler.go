package artists

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/auth"
	"github.com/openstudio/openstudio/services/api/internal/httpx"
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
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}

	uid := auth.UserIDFromContext(c)
	artist, err := h.svc.Create(c.Request.Context(), CreateArtistInput{
		Name:       req.Name,
		Slug:       req.Slug,
		Bio:        req.Bio,
		Genres:     req.Genres,
		LookingFor: req.LookingFor,
		CreatedBy:  uid,
	})
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
