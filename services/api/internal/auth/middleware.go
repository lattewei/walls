package auth

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/httpx"
)

const (
	// ContextUserID is the gin context key for the authenticated user id.
	ContextUserID = "auth_user_id"
	// ContextHandle is the gin context key for the authenticated handle.
	ContextHandle = "auth_handle"
	// ContextRole is the gin context key for the authenticated role.
	ContextRole = "auth_role"
)

// Middleware validates Bearer access tokens.
type Middleware struct {
	tokens *TokenService
}

// NewMiddleware creates auth middleware.
func NewMiddleware(tokens *TokenService) *Middleware {
	return &Middleware{tokens: tokens}
}

// RequireAuth aborts with 401 if the request has no valid access token.
func (m *Middleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := m.parse(c)
		if !ok {
			httpx.Unauthorized(c, "authentication required")
			return
		}
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextHandle, claims.Handle)
		c.Set(ContextRole, claims.Role)
		c.Next()
	}
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

// UserIDFromContext returns the authenticated user id, or empty.
func UserIDFromContext(c *gin.Context) string {
	v, _ := c.Get(ContextUserID)
	s, _ := v.(string)
	return s
}
