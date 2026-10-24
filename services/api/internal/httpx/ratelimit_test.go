package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestUntrustedForwardedForIsIgnored(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	if err := r.SetTrustedProxies(nil); err != nil {
		t.Fatal(err)
	}
	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.8:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Body.String() != "203.0.113.8" {
		t.Fatalf("ClientIP = %q, want remote address", w.Body.String())
	}
}

func TestMemoryRateLimiterAllowsThenBlocks(t *testing.T) {
	l := NewMemoryRateLimiter(3, time.Minute)

	for i := 0; i < 3; i++ {
		ok, rem, _ := l.Allow("ip1")
		if !ok {
			t.Fatalf("request %d should be allowed", i+1)
		}
		if rem != 3-i-1 {
			t.Fatalf("remaining = %d, want %d", rem, 3-i-1)
		}
	}
	ok, rem, _ := l.Allow("ip1")
	if ok || rem != 0 {
		t.Fatalf("4th request should be blocked, ok=%v rem=%d", ok, rem)
	}

	ok, _, _ = l.Allow("ip2")
	if !ok {
		t.Fatal("other key should be allowed")
	}
}

func TestMemoryRateLimiterWindowReset(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	now := base
	l := NewMemoryRateLimiter(1, time.Minute)
	l.now = func() time.Time { return now }

	ok, _, _ := l.Allow("x")
	if !ok {
		t.Fatal("first should allow")
	}
	ok, _, _ = l.Allow("x")
	if ok {
		t.Fatal("second should block")
	}

	now = base.Add(time.Minute)
	ok, _, _ = l.Allow("x")
	if !ok {
		t.Fatal("after window should allow again")
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	lim := NewMemoryRateLimiter(2, time.Minute)
	r.POST("/auth/login", RateLimit(lim), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("req %d status = %d", i+1, w.Code)
		}
	}
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429", w.Code)
	}
}
