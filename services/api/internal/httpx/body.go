package httpx

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func LimitBody(n int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if n > 0 && c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, n)
		}
		c.Next()
	}
}

func IsBodyTooLarge(err error) bool {
	var max *http.MaxBytesError
	return errors.As(err, &max)
}
