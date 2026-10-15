package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func JSONError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorBody{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

func Internal(c *gin.Context) {
	JSONError(c, http.StatusInternalServerError, "internal_error", "internal server error")
}

func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "resource not found"
	}
	JSONError(c, http.StatusNotFound, "not_found", message)
}

func BadRequest(c *gin.Context, message string) {
	JSONError(c, http.StatusBadRequest, "bad_request", message)
}

func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "authentication required"
	}
	JSONError(c, http.StatusUnauthorized, "unauthorized", message)
}

func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "forbidden"
	}
	JSONError(c, http.StatusForbidden, "forbidden", message)
}
