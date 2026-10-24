package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lattewei/walls/services/api/internal/config"
	"github.com/lattewei/walls/services/api/internal/db"
	"github.com/lattewei/walls/services/api/internal/envfile"
	"github.com/lattewei/walls/services/api/internal/server"
)

func main() {
	os.Exit(run())
}

func run() int {
	envfile.Load()

	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		return 1
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("database", "err", err)
		return 1
	}
	defer pool.Close()

	srv, err := server.New(cfg, log, pool)
	if err != nil {
		log.Error("server", "err", err)
		return 1
	}
	httpSrv := srv.HTTPServer()
	errCh := make(chan error, 1)
	go func() {
		log.Info("api listening", "addr", cfg.Addr(), "env", cfg.Env)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-stop:
		log.Info("shutting down")
	case err := <-errCh:
		log.Error("listen", "err", err)
		return 1
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown", "err", err)
		return 1
	}
	return 0
}
