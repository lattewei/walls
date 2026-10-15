package auth

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/openstudio/openstudio/services/api/internal/httpx"
)

const (
	ContextUserID = "auth_user_id"
	ContextHandle = "auth_handle"
	ContextRole   = "auth_role"
)

type Middleware struct {
	tokens *TokenService
}

func NewMiddleware(tokens *TokenService) *Middleware {
	return &Middleware{tokens: tokens}
}

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

func UserIDFromContext(c *gin.Context) string {
	v, _ := c.Get(ContextUserID)
	s, _ := v.(string)
	return s
}
