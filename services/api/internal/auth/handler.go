package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/domain"
	"github.com/lattewei/walls/services/api/internal/httpx"
)

type Handler struct {
	svc *Service
}

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
	DisplayName        *string         `json:"display_name"`
	Bio                *string         `json:"bio"`
	PublicContactEmail json.RawMessage `json:"public_contact_email"`
	InstagramURL       json.RawMessage `json:"instagram_url"`
	OtherLinks         json.RawMessage `json:"other_links"`
}

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

func (h *Handler) Logout(c *gin.Context) {
	if err := h.svc.Logout(c.Request.Context(), httpx.UserID(c)); err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) Me(c *gin.Context) {
	uid := httpx.UserID(c)
	res, err := h.svc.Me(c.Request.Context(), uid)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

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

	uid := httpx.UserID(c)
	res, err := h.svc.UpdateProfile(c.Request.Context(), uid, in)
	if err != nil {
		h.mapError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

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
