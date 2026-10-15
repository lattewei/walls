package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/openstudio/openstudio/services/api/internal/config"
	"github.com/openstudio/openstudio/services/api/internal/httpx"
)

// Server wires HTTP routes and dependencies.
type Server struct {
	cfg    config.Config
	log    *slog.Logger
	pool   *pgxpool.Pool
	engine *gin.Engine
}

// New builds the HTTP server with middleware and routes.
func New(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) *Server {
	if !cfg.IsDev() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(httpx.SecureHeaders())
	r.Use(httpx.CORS(cfg.CORSOrigins))
	r.Use(httpx.RequestLogger(log))

	s := &Server{cfg: cfg, log: log, pool: pool, engine: r}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.engine.GET("/health", s.handleProcessHealth)

	v1 := s.engine.Group("/api/v1")
	{
		v1.GET("/health", s.handleHealth)
	}
}

// Engine exposes the Gin engine (tests / custom listeners).
func (s *Server) Engine() *gin.Engine {
	return s.engine
}

// HTTPServer returns a configured net/http.Server.
func (s *Server) HTTPServer() *http.Server {
	return &http.Server{
		Addr:              s.cfg.Addr(),
		Handler:           s.engine,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func (s *Server) handleProcessHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "openstudio-api",
	})
}

func (s *Server) handleHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := s.pool.Ping(ctx); err != nil {
		s.log.Error("health db ping failed", "err", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "degraded",
			"service": "openstudio-api",
			"db":      "unavailable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "openstudio-api",
		"db":      dbStatus,
	})
}
