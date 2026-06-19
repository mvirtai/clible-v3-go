package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/config"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	dbConn, err := db.InitializeDB(cfg.DBPath)
	if err != nil {
		slog.Error("Critical database boot initialization failed", "error", err)
		os.Exit(1)
	}
	defer func() { _ = dbConn.Close() }()

	// --- Repositories ---
	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	historyRepo := db.NewSearchHistoryRepository(dbConn)
	scopeRepo := db.NewScopeRepository(dbConn) // Injected scopes repository
	savedRepo := db.NewSavedRepository(dbConn) // Injected saved asset repository

	// --- Services ---
	verseService := services.NewVerseService(verseRepo, translationRepo)
	historyService := services.NewSearchHistoryService(historyRepo)
	scopeService := services.NewScopeService(scopeRepo, savedRepo) // Injected scopes service business layers

	// --- API Handlers ---
	bibleHandler := api.NewBibleHandler(verseService)
	historyHandler := api.NewHistoryHandler(historyService)
	scopeHandler := api.NewScopeHandler(scopeService) // Injected scopes presentation layer controller

	mux := http.NewServeMux()

	// Core Verse & Bible lookup points
	mux.HandleFunc("GET /api/verses", bibleHandler.GetVersesByReference)
	mux.HandleFunc("GET /api/search", bibleHandler.SearchVerses)

	// User Telemetry History endpoint paths
	mux.HandleFunc("POST /api/history", historyHandler.AddSearch)
	mux.HandleFunc("GET /api/history", historyHandler.GetRecentHistory)

	// Workspace Scopes & Saved Analytics endpoint structures
	mux.HandleFunc("POST /api/scopes", scopeHandler.CreateScope)
	mux.HandleFunc("GET /api/scopes", scopeHandler.GetScopes)
	mux.HandleFunc("DELETE /api/scopes", scopeHandler.DeleteScope)
	mux.HandleFunc("POST /api/scopes/saved-searches", scopeHandler.SaveSearch)
	mux.HandleFunc("POST /api/scopes/saved-analyses", scopeHandler.SaveAnalysis)
	mux.HandleFunc("GET /api/scopes/workspace", scopeHandler.GetScopeWorkspace)

	var handler http.Handler = mux
	handler = middleware.Logger(handler)
	handler = middleware.CORS(handler)
	handler = middleware.Recovery(handler)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		slog.Info("Unified Clible-v3 REST backend cleanly executing", "port", cfg.Port)
		serverErrors <- server.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		slog.Error("Server orchestration failed unexpectedly", "error", err)
		os.Exit(1)
	case sig := <-shutdown:
		slog.Info("Graceful shutdown sequence triggered cleanly", "signal", sig)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			slog.Error("Server forced to close before completing inflight jobs", "error", err)
			_ = server.Close()
			os.Exit(1)
		}
	}
}
