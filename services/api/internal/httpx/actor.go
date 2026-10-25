package httpx

import "github.com/gin-gonic/gin"

const (
	UserIDKey = "auth_user_id"
	RoleKey   = "auth_role"
)

func UserID(c *gin.Context) string {
	v, _ := c.Get(UserIDKey)
	s, _ := v.(string)
	return s
}

func Role(c *gin.Context) string {
	v, _ := c.Get(RoleKey)
	s, _ := v.(string)
	return s
}
