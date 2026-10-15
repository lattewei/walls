package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/domain"
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

// updateMeRequest uses json.RawMessage for contact fields so clients can
// explicitly clear a value with null vs omit the field entirely.
type updateMeRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`

	PublicContactEmail json.RawMessage `json:"public_contact_email"`
	InstagramURL       json.RawMessage `json:"instagram_url"`
	OtherLinks         json.RawMessage `json:"other_links"`
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
	res, err := h.svc.Me(c.Request.Context(), uid)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// UpdateMe PATCH /api/v1/me
func (h *Handler) UpdateMe(c *gin.Context) {
	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "invalid JSON body")
		return
	}

	in := UpdateProfileInput{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
	}

	if len(req.PublicContactEmail) > 0 {
		val, err := parseOptionalStringField(req.PublicContactEmail)
		if err != nil {
			httpx.BadRequest(c, "invalid public_contact_email")
			return
		}
		in.PublicContactEmail = &val
	}
	if len(req.InstagramURL) > 0 {
		val, err := parseOptionalStringField(req.InstagramURL)
		if err != nil {
			httpx.BadRequest(c, "invalid instagram_url")
			return
		}
		in.InstagramURL = &val
	}
	if len(req.OtherLinks) > 0 {
		if string(req.OtherLinks) == "null" {
			empty := []domain.ExternalLink{}
			in.OtherLinks = &empty
		} else {
			var links []domain.ExternalLink
			if err := json.Unmarshal(req.OtherLinks, &links); err != nil {
				httpx.BadRequest(c, "invalid other_links")
				return
			}
			in.OtherLinks = &links
		}
	}

	if in.DisplayName == nil && in.Bio == nil &&
		in.PublicContactEmail == nil && in.InstagramURL == nil && in.OtherLinks == nil {
		httpx.BadRequest(c, "no fields to update")
		return
	}

	uid := UserIDFromContext(c)
	res, err := h.svc.UpdateProfile(c.Request.Context(), uid, in)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// parseOptionalStringField decodes a JSON string or null into *string (nil means clear).
func parseOptionalStringField(raw json.RawMessage) (*string, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, err
	}
	return &s, nil
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
