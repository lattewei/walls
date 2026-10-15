package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorBody is the standard API error payload.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail describes a single error.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSONError writes a consistent JSON error response.
func JSONError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorBody{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

// Internal writes a generic 500 without leaking internals.
func Internal(c *gin.Context) {
	JSONError(c, http.StatusInternalServerError, "internal_error", "internal server error")
}

// NotFound writes a 404.
func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "resource not found"
	}
	JSONError(c, http.StatusNotFound, "not_found", message)
}

// BadRequest writes a 400.
func BadRequest(c *gin.Context, message string) {
	JSONError(c, http.StatusBadRequest, "bad_request", message)
}

// Unauthorized writes a 401.
func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "authentication required"
	}
	JSONError(c, http.StatusUnauthorized, "unauthorized", message)
}

// Forbidden writes a 403.
func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "forbidden"
	}
	JSONError(c, http.StatusForbidden, "forbidden", message)
}
