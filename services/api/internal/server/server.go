package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/openstudio/openstudio/services/api/internal/artists"
	"github.com/openstudio/openstudio/services/api/internal/auth"
	"github.com/openstudio/openstudio/services/api/internal/config"
	"github.com/openstudio/openstudio/services/api/internal/httpx"
	"github.com/openstudio/openstudio/services/api/internal/users"
)

type Server struct {
	cfg    config.Config
	log    *slog.Logger
	pool   *pgxpool.Pool
	engine *gin.Engine

	authHandler    *auth.Handler
	authMW         *auth.Middleware
	usersHandler   *users.Handler
	artistsHandler *artists.Handler
	authLimiter    *httpx.MemoryRateLimiter
}

func New(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) *Server {
	if !cfg.IsDev() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(httpx.SecureHeaders())
	r.Use(httpx.CORS(cfg.CORSOrigins))
	r.Use(httpx.RequestLogger(log))

	userRepo := users.NewRepository(pool)
	artistRepo := artists.NewRepository(pool)
	tokens := auth.NewTokenService(cfg.JWTSecret, cfg.JWTAccessTTL)
	authSvc := auth.NewService(userRepo, tokens)
	usersSvc := users.NewService(userRepo)
	artistsSvc := artists.NewService(artistRepo)

	s := &Server{
		cfg:            cfg,
		log:            log,
		pool:           pool,
		engine:         r,
		authHandler:    auth.NewHandler(authSvc),
		authMW:         auth.NewMiddleware(tokens),
		usersHandler:   users.NewHandler(usersSvc),
		artistsHandler: artists.NewHandler(artistsSvc),
		authLimiter:    httpx.NewMemoryRateLimiter(cfg.AuthRateLimit, cfg.AuthRateWindow),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.engine.GET("/health", s.handleProcessHealth)

	v1 := s.engine.Group("/api/v1")
	{
		v1.GET("/health", s.handleHealth)

		authLimit := httpx.RateLimit(s.authLimiter)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authLimit, s.authHandler.Register)
			authGroup.POST("/login", authLimit, s.authHandler.Login)
			authGroup.POST("/logout", s.authHandler.Logout)
		}

		me := v1.Group("/me")
		me.Use(s.authMW.RequireAuth())
		{
			me.GET("", s.authHandler.Me)
			me.PATCH("", s.authHandler.UpdateMe)
		}

		v1.GET("/users/:handle", s.usersHandler.GetByHandle)

		artistsGroup := v1.Group("/artists")
		{
			artistsGroup.GET("", s.artistsHandler.List)
			artistsGroup.POST("", s.authMW.RequireAuth(), s.artistsHandler.Create)
			artistsGroup.GET("/:slug", s.artistsHandler.GetBySlug)
		}
	}
}

func (s *Server) Engine() *gin.Engine {
	return s.engine
}

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
		"status":  "ok",
		"service": "openstudio-api",
	})
}

func (s *Server) handleHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if s.pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "degraded",
			"service": "openstudio-api",
			"db":      "unavailable",
		})
		return
	}
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
		"db":      "ok",
	})
}
