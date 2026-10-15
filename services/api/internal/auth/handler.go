package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/httpx"
)

// Handler exposes auth HTTP endpoints.
type Handler struct {
	svc *Service
}

// NewHandler creates an auth HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type registerRequest struct {
	Handle      string `json:"handle"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

type loginRequest struct {
	Handle   string `json:"handle"`
	Password string `json:"password"`
}

type updateMeRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
}

// Register POST /api/v1/auth/register
func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}

	res, err := h.svc.Register(c.Request.Context(), RegisterInput{
		Handle:      req.Handle,
		Password:    req.Password,
		DisplayName: req.DisplayName,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusCreated, res)
}

// Login POST /api/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}

	res, err := h.svc.Login(c.Request.Context(), LoginInput{
		Handle:   req.Handle,
		Password: req.Password,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// Logout POST /api/v1/auth/logout
// Stateless JWT: client discards the token. Endpoint exists for API symmetry / future denylist.
func (h *Handler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Me GET /api/v1/me
func (h *Handler) Me(c *gin.Context) {
	uid := UserIDFromContext(c)
	user, err := h.svc.Me(c.Request.Context(), uid)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// UpdateMe PATCH /api/v1/me
func (h *Handler) UpdateMe(c *gin.Context) {
	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}
	if req.DisplayName == nil && req.Bio == nil {
		httpx.BadRequest(c, "no fields to update")
		return
	}

	uid := UserIDFromContext(c)
	user, err := h.svc.UpdateProfile(c.Request.Context(), uid, UpdateProfileInput{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
	})
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		msg := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": ")
		httpx.JSONError(c, http.StatusBadRequest, "validation_error", msg)
	case errors.Is(err, ErrHandleTaken):
		httpx.JSONError(c, http.StatusConflict, "handle_taken", "handle already taken")
	case errors.Is(err, ErrInvalidCredentials):
		httpx.JSONError(c, http.StatusUnauthorized, "invalid_credentials", "invalid handle or password")
	case errors.Is(err, ErrUnauthorized):
		httpx.Unauthorized(c, "authentication required")
	default:
		httpx.Internal(c)
	}
}
