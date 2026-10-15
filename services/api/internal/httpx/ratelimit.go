package httpx

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type MemoryRateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateEntry
	limit   int
	window  time.Duration
	now     func() time.Time
}

type rateEntry struct {
	count int
	reset time.Time
}

func NewMemoryRateLimiter(limit int, window time.Duration) *MemoryRateLimiter {
	if limit < 1 {
		limit = 1
	}
	if window < time.Second {
		window = time.Second
	}
	return &MemoryRateLimiter{
		entries: make(map[string]rateEntry),
		limit:   limit,
		window:  window,
		now:     time.Now,
	}
}

func (l *MemoryRateLimiter) Allow(key string) (allowed bool, remaining int, resetAt time.Time) {
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	if len(l.entries) > 10_000 {
		for k, e := range l.entries {
			if !now.Before(e.reset) {
				delete(l.entries, k)
			}
		}
	}

	e, ok := l.entries[key]
	if !ok || !now.Before(e.reset) {
		reset := now.Add(l.window)
		l.entries[key] = rateEntry{count: 1, reset: reset}
		return true, l.limit - 1, reset
	}

	if e.count >= l.limit {
		return false, 0, e.reset
	}

	e.count++
	l.entries[key] = e
	return true, l.limit - e.count, e.reset
}

func RateLimit(limiter *MemoryRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if key == "" {
			key = "unknown"
		}
		allowed, remaining, resetAt := limiter.Allow(key)
		c.Header("X-RateLimit-Limit", itoa(limiter.limit))
		c.Header("X-RateLimit-Remaining", itoa(maxInt(0, remaining)))
		c.Header("X-RateLimit-Reset", itoa(int(resetAt.Unix())))

		if !allowed {
			retry := int(resetAt.Sub(limiter.now()).Seconds())
			if retry < 1 {
				retry = 1
			}
			c.Header("Retry-After", itoa(retry))
			JSONError(c, http.StatusTooManyRequests, "rate_limited", "too many requests, try again later")
			return
		}
		c.Next()
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
