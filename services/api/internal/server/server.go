package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lattewei/walls/services/api/internal/artists"
	"github.com/lattewei/walls/services/api/internal/auth"
	"github.com/lattewei/walls/services/api/internal/config"
	"github.com/lattewei/walls/services/api/internal/httpx"
	"github.com/lattewei/walls/services/api/internal/media"
	"github.com/lattewei/walls/services/api/internal/moderation"
	"github.com/lattewei/walls/services/api/internal/tracks"
	"github.com/lattewei/walls/services/api/internal/users"
)

type Server struct {
	cfg     config.Config
	log     *slog.Logger
	pool    *pgxpool.Pool
	engine  *gin.Engine
	storage *media.LocalStorage

	authHandler       *auth.Handler
	authMW            *auth.Middleware
	usersHandler      *users.Handler
	artistsHandler    *artists.Handler
	tracksHandler     *tracks.Handler
	moderationHandler *moderation.Handler
	authLimiter       *httpx.MemoryRateLimiter
}

func New(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) (*Server, error) {
	if !cfg.IsDev() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	proxies := cfg.TrustedProxies
	if proxies == nil {
		proxies = []string{"127.0.0.1", "::1"}
	}
	if err := r.SetTrustedProxies(proxies); err != nil {
		return nil, fmt.Errorf("trusted proxies: %w", err)
	}
	r.Use(gin.Recovery())
	r.Use(httpx.SecureHeaders())
	r.Use(httpx.CORS(cfg.CORSOrigins))
	r.Use(httpx.RequestLogger(log))

	mediaPath := cfg.MediaLocalPath
	if mediaPath == "" {
		mediaPath = "./data/media"
	}
	storage, err := media.NewLocalStorage(mediaPath)
	if err != nil {
		return nil, fmt.Errorf("media storage: %w", err)
	}

	userRepo := users.NewRepository(pool)
	artistRepo := artists.NewRepository(pool)
	trackRepo := tracks.NewRepository(pool)
	reportRepo := moderation.NewRepository(pool)

	tokens := auth.NewTokenService(cfg.JWTSecret, cfg.JWTAccessTTL)
	authSvc := auth.NewService(userRepo, tokens)
	usersSvc := users.NewService(userRepo, storage)
	artistsSvc := artists.NewService(artistRepo, storage)
	tracksSvc := tracks.NewService(trackRepo, artistRepo, storage, cfg.MediaMaxBytes, cfg.TrackDailyLimit)
	modSvc := moderation.NewService(reportRepo)

	s := &Server{
		cfg:               cfg,
		log:               log,
		pool:              pool,
		engine:            r,
		storage:           storage,
		authHandler:       auth.NewHandler(authSvc),
		authMW:            auth.NewMiddleware(tokens, userRepo),
		usersHandler:      users.NewHandler(usersSvc),
		artistsHandler:    artists.NewHandler(artistsSvc),
		tracksHandler:     tracks.NewHandler(tracksSvc),
		moderationHandler: moderation.NewHandler(modSvc, tracksSvc),
		authLimiter:       httpx.NewMemoryRateLimiter(cfg.AuthRateLimit, cfg.AuthRateWindow),
	}
	s.routes()
	return s, nil
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
			authGroup.POST("/logout", s.authMW.RequireAuth(), s.authHandler.Logout)
		}

		me := v1.Group("/me")
		me.Use(s.authMW.RequireAuth())
		{
			me.GET("", s.authHandler.Me)
			me.PATCH("", s.authHandler.UpdateMe)
			me.POST("/avatar", httpx.LimitBody(5<<20+1<<16), s.usersHandler.UploadAvatar)
			me.GET("/claims", s.artistsHandler.ListMine)
		}

		v1.GET("/producers", s.tracksHandler.ListProducers)
		v1.GET("/users/:handle/tracks", s.tracksHandler.ListByUploader)
		v1.GET("/users/:handle", s.usersHandler.GetByHandle)
		v1.GET("/media/:key", s.handleMedia)

		artistsGroup := v1.Group("/artists")
		{
			artistsGroup.GET("", s.artistsHandler.List)
			artistsGroup.POST("", s.authMW.RequireAuth(), httpx.LimitBody((5<<20)+1<<20), s.artistsHandler.Create)
			artistsGroup.GET("/:slug", s.artistsHandler.GetBySlug)
			artistsGroup.PATCH("/:slug", s.authMW.RequireAuth(), httpx.LimitBody((5<<20)+1<<20), s.artistsHandler.Update)
			artistsGroup.GET("/:slug/tracks", s.tracksHandler.ListByArtist)
			artistsGroup.POST("/:slug/claims", s.authMW.RequireAuth(), s.artistsHandler.RequestClaim)
		}

		tracksGroup := v1.Group("/tracks")
		{
			tracksGroup.POST("", s.authMW.RequireAuth(), httpx.LimitBody(s.cfg.MediaMaxBytes+1<<20), s.tracksHandler.Create)
			tracksGroup.GET("/:id", s.tracksHandler.Get)
			tracksGroup.PATCH("/:id", s.authMW.RequireAuth(), s.tracksHandler.Update)
			tracksGroup.GET("/:id/audio", s.tracksHandler.StreamAudio)
			tracksGroup.DELETE("/:id", s.authMW.RequireAuth(), s.tracksHandler.Withdraw)
		}

		v1.POST("/reports", s.authMW.RequireAuth(), s.moderationHandler.CreateReport)

		admin := v1.Group("/admin")
		admin.Use(s.authMW.RequireAdmin())
		{
			admin.GET("/reports", s.moderationHandler.ListReports)
			admin.PATCH("/reports/:id", s.moderationHandler.UpdateReport)
			admin.POST("/tracks/:id/hide", s.moderationHandler.HideTrack)
			admin.GET("/claims", s.artistsHandler.ListPendingClaims)
			admin.PATCH("/claims/:id", s.artistsHandler.ReviewClaim)
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
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       120 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func (s *Server) handleProcessHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "walls-api",
	})
}

func (s *Server) handleHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if s.pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "degraded",
			"service": "walls-api",
			"db":      "unavailable",
		})
		return
	}
	if err := s.pool.Ping(ctx); err != nil {
		s.log.Error("health db ping failed", "err", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "degraded",
			"service": "walls-api",
			"db":      "unavailable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "walls-api",
		"db":      "ok",
	})
}

func (s *Server) handleMedia(c *gin.Context) {
	key := c.Param("key")
	if media.IsAudioKey(key) {
		httpx.NotFound(c, "media not found")
		return
	}
	if s.storage == nil {
		httpx.NotFound(c, "media not found")
		return
	}
	f, err := s.storage.Open(key)
	if err != nil {
		httpx.NotFound(c, "media not found")
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		httpx.Internal(c)
		return
	}
	c.Header("Content-Type", media.MIMEFromKey(key))
	c.Header("Cache-Control", "public, max-age=86400")
	http.ServeContent(c.Writer, c.Request, stat.Name(), stat.ModTime(), f)
}
