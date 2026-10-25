package auth

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lattewei/walls/services/api/internal/httpx"
	"github.com/lattewei/walls/services/api/internal/users"
)

const ContextUserID = httpx.UserIDKey

type Middleware struct {
	tokens   *TokenService
	sessions users.SessionStore
}

func NewMiddleware(tokens *TokenService, sessions users.SessionStore) *Middleware {
	return &Middleware{tokens: tokens, sessions: sessions}
}

func (m *Middleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !m.attach(c, false) {
			return
		}
		c.Next()
	}
}

func (m *Middleware) Optional() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := m.parse(c)
		if !ok || m.sessions == nil {
			c.Next()
			return
		}
		state, err := m.sessions.AuthState(c.Request.Context(), claims.UserID)
		if err != nil || state.SessionVersion != claims.SessionVersion {
			c.Next()
			return
		}
		c.Set(ContextUserID, claims.UserID)
		c.Set(httpx.RoleKey, state.Role)
		c.Next()
	}
}

func (m *Middleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !m.attach(c, true) {
			return
		}
		c.Next()
	}
}

func (m *Middleware) attach(c *gin.Context, admin bool) bool {
	claims, ok := m.parse(c)
	if !ok {
		httpx.Unauthorized(c, "authentication required")
		return false
	}
	if m.sessions == nil {
		httpx.Unauthorized(c, "authentication required")
		return false
	}
	state, err := m.sessions.AuthState(c.Request.Context(), claims.UserID)
	if errors.Is(err, users.ErrNotFound) {
		httpx.Unauthorized(c, "authentication required")
		return false
	}
	if err != nil {
		httpx.Internal(c)
		return false
	}
	if state.SessionVersion != claims.SessionVersion {
		httpx.Unauthorized(c, "authentication required")
		return false
	}
	if admin && state.Role != "admin" {
		httpx.Forbidden(c, "admin required")
		return false
	}
	c.Set(ContextUserID, claims.UserID)
	c.Set(httpx.RoleKey, state.Role)
	return true
}

func (m *Middleware) parse(c *gin.Context) (Claims, bool) {
	h := c.GetHeader("Authorization")
	if h == "" {
		return Claims{}, false
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return Claims{}, false
	}
	claims, err := m.tokens.ParseAccessToken(parts[1])
	if err != nil {
		return Claims{}, false
	}
	return claims, true
}
