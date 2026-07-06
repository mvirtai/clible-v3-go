package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"golang.org/x/time/rate"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/config"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	bootStart := time.Now()

	cfg := config.Load()

	dbConn, err := db.InitializeDB(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Critical database boot initialization failed", "error", err)
		os.Exit(1)
	}
	defer func() { _ = dbConn.Close() }()

	// --- Repositories ---
	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)
	historyRepo := db.NewSearchHistoryRepository(dbConn)
	scopeRepo := db.NewScopeRepository(dbConn)
	savedRepo := db.NewSavedRepository(dbConn)
	bookRepo := db.NewBookRepository(dbConn)
	userRepo := db.NewUserRepository(dbConn)

	// --- Services & Parsers ---
	verseService := services.NewVerseService(verseRepo, translationRepo)
	historyService := services.NewSearchHistoryService(historyRepo)
	scopeService := services.NewScopeService(scopeRepo, savedRepo)
	bookService := services.NewBookService(bookRepo)
	xmlParser := parsers.NewXMLVerseParser()
	seedService := services.NewSeedService(verseRepo, xmlParser)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		slog.Error("Critical startup failure: JWT_SECRET environment variable is not set")
		os.Exit(1)
	}
	if len(jwtSecret) < 32 {
		slog.Error("Critical startup failure: JWT_SECRET must be at least 32 characters long")
		os.Exit(1)
	}
	authService := services.NewAuthService(userRepo, jwtSecret)

	analyticService, err := services.NewAnalyticService(verseRepo, true, "en,fi,grc,el")
	if err != nil {
		slog.Error("Critical analytics service initialization failed", "error", err)
		os.Exit(1)
	}

	// --- API Handlers ---
	bibleHandler := api.NewBibleHandler(verseService)
	historyHandler := api.NewHistoryHandler(historyService)
	scopeHandler := api.NewScopeHandler(scopeService)
	translationHandler := api.NewTranslationHandler(translationRepo, seedService)
	analyticsHandler := api.NewAnalyticsHandler(analyticService, verseService)
	bookHandler := api.NewBookHandler(bookService)
	authHandler := api.NewAuthHandler(authService, userRepo)

	mux := http.NewServeMux()

	requireAuth := middleware.RequireAuth(authService)

	// Verse & Bible endpoints
	mux.Handle("GET /api/verses", requireAuth(http.HandlerFunc(bibleHandler.GetVersesByReference)))
	mux.Handle("GET /api/search", requireAuth(http.HandlerFunc(bibleHandler.SearchVerses)))

	// Book metadata endpoints
	mux.HandleFunc("GET /api/books", bookHandler.GetBooks)
	mux.HandleFunc("GET /api/books/{id}", bookHandler.GetBookByID)

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/logout", authHandler.Logout)
	mux.HandleFunc("GET /api/auth/me", authHandler.Me)

	// Search History endpoints (Protected by Auth middleware)
	mux.Handle("POST /api/history", requireAuth(http.HandlerFunc(historyHandler.AddSearch)))
	mux.Handle("GET /api/history", requireAuth(http.HandlerFunc(historyHandler.GetRecentHistory)))

	// Catalog & Streaming Import endpoints
	mux.Handle("GET /api/translations", requireAuth(http.HandlerFunc(translationHandler.GetTranslations)))
	mux.Handle("POST /api/translations/import", requireAuth(http.HandlerFunc(translationHandler.ImportTranslation)))

	// Workspace Scopes & Saved Analytics endpoints (Protected by Auth middleware)
	mux.Handle("POST /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.CreateScope)))
	mux.Handle("GET /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.GetScopes)))
	mux.Handle("DELETE /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.DeleteScope)))
	mux.Handle("POST /api/scopes/saved-searches", requireAuth(http.HandlerFunc(scopeHandler.SaveSearch)))
	mux.Handle("POST /api/scopes/saved-analyses", requireAuth(http.HandlerFunc(scopeHandler.SaveAnalysis)))
	mux.Handle("GET /api/scopes/workspace", requireAuth(http.HandlerFunc(scopeHandler.GetScopeWorkspace)))

	// Text Analysis Engine endpoints
	mux.Handle("POST /api/analytics/analyze", requireAuth(http.HandlerFunc(analyticsHandler.Analyze)))
	mux.Handle("POST /api/analytics/compare", requireAuth(http.HandlerFunc(analyticsHandler.Compare)))

	// Static SPA fallback
	fs := http.FileServer(http.Dir(cfg.FrontendDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.Error(w, "API endpoint not found", http.StatusNotFound)
			return
		}

		filePath := filepath.Join(cfg.FrontendDir, r.URL.Path)
		info, err := os.Stat(filePath)

		if os.IsNotExist(err) || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(cfg.FrontendDir, "index.html"))
			return
		}

		fs.ServeHTTP(w, r)
	})

	limiter := middleware.NewIPRateLimiter(rate.Limit(20), 30)

	var handler http.Handler = mux
	handler = middleware.RateLimitMiddleware(limiter)(handler)
	handler = middleware.Logger(handler)
	handler = middleware.CORS(handler)
	handler = middleware.Recovery(handler)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		slog.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		slog.Info("🚀 Clible-v3 REST API server starting")
		slog.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		slog.Info("  ⚙️  Config",
			"port", cfg.Port,
			"db", cfg.DatabaseURL,
			"frontend_dir", cfg.FrontendDir,
		)
		slog.Info("  📡 Registered API routes")
		slog.Info("     GET   /api/verses")
		slog.Info("     GET   /api/search")
		slog.Info("     GET   /api/books")
		slog.Info("     GET   /api/books/{id}")
		slog.Info("     POST  /api/auth/register")
		slog.Info("     POST  /api/auth/login")
		slog.Info("     POST  /api/auth/logout")
		slog.Info("     GET   /api/auth/me")
		slog.Info("     POST  /api/history            [protected]")
		slog.Info("     GET   /api/history            [protected]")
		slog.Info("     GET   /api/translations")
		slog.Info("     POST  /api/translations/import")
		slog.Info("     POST  /api/scopes             [protected]")
		slog.Info("     GET   /api/scopes             [protected]")
		slog.Info("     DELETE /api/scopes            [protected]")
		slog.Info("     POST  /api/scopes/saved-searches [protected]")
		slog.Info("     POST  /api/scopes/saved-analyses [protected]")
		slog.Info("     GET   /api/scopes/workspace   [protected]")
		slog.Info("     POST  /api/analytics/analyze")
		slog.Info("     POST  /api/analytics/compare")
		slog.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		slog.Info("✅ Server ready",
			"addr", "http://localhost:"+cfg.Port,
			"boot_time", time.Since(bootStart).Round(time.Millisecond).String(),
		)
		slog.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		serverErrors <- server.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		slog.Error("Server orchestration failed unexpectedly", "error", err)
		os.Exit(1)
	case sig := <-shutdown:
		slog.Info("🛑 Graceful shutdown sequence triggered",
			"signal", sig,
			"uptime", time.Since(bootStart).Round(time.Second).String(),
		)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			slog.Error("Server forced to close before completing inflight jobs", "error", err)
			_ = server.Close()
			os.Exit(1)
		}
	}
}
