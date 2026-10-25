package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestLocalOrigin(t *testing.T) {
	ok := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3001",
		"http://[::1]:3000",
	}
	for _, o := range ok {
		if !localOrigin(o) {
			t.Errorf("%s should be local", o)
		}
	}
	if localOrigin("https://walls.example") || localOrigin("http://evil.com") {
		t.Fatal("remote origin must not be local")
	}
}

func TestCORSAllowsLocalhostInDev(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(nil, true))
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodOptions, "/x", nil)
	req.Header.Set("Origin", "http://127.0.0.1:3000")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Header().Get("Access-Control-Allow-Origin") != "http://127.0.0.1:3000" {
		t.Fatalf("allow origin = %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}
