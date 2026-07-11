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
	notebookRepo := db.NewNotebookRepository(dbConn)

	// --- Services & Parsers ---
	verseService := services.NewVerseService(verseRepo, translationRepo)
	historyService := services.NewSearchHistoryService(historyRepo)
	scopeService := services.NewScopeService(scopeRepo, savedRepo)
	bookService := services.NewBookService(bookRepo)
	notebookService := services.NewNotebookService(notebookRepo)

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

	aiService := services.NewAIService(cfg, verseRepo)

	// --- API Handlers ---
	bibleHandler := api.NewBibleHandler(verseService)
	historyHandler := api.NewHistoryHandler(historyService)
	scopeHandler := api.NewScopeHandler(scopeService)
	translationHandler := api.NewTranslationHandler(translationRepo)
	analyticsHandler := api.NewAnalyticsHandler(analyticService, verseService)
	bookHandler := api.NewBookHandler(bookService)
	authHandler := api.NewAuthHandler(authService, userRepo)
	aiHandler := api.NewAIHandler(aiService)
	notebookHandler := api.NewNotebookHandler(notebookService)

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

	// Catalog & Translation activation endpoints
	mux.Handle("GET /api/translations", requireAuth(http.HandlerFunc(translationHandler.GetTranslations)))
	mux.Handle("POST /api/translations/link", requireAuth(http.HandlerFunc(translationHandler.LinkTranslation)))
	mux.Handle("DELETE /api/translations/link", requireAuth(http.HandlerFunc(translationHandler.UnlinkTranslation)))

	// Workspace Scopes & Saved Analytics endpoints (Protected by Auth middleware)
	mux.Handle("POST /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.CreateScope)))
	mux.Handle("GET /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.GetScopes)))
	mux.Handle("DELETE /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.DeleteScope)))
	mux.Handle("PUT /api/scopes", requireAuth(http.HandlerFunc(scopeHandler.RenameScope)))
	mux.Handle("POST /api/scopes/saved-searches", requireAuth(http.HandlerFunc(scopeHandler.SaveSearch)))
	mux.Handle("DELETE /api/scopes/saved-searches", requireAuth(http.HandlerFunc(scopeHandler.DeleteSearch)))
	mux.Handle("PUT /api/scopes/saved-searches", requireAuth(http.HandlerFunc(scopeHandler.RenameSearch)))
	mux.Handle("POST /api/scopes/saved-analyses", requireAuth(http.HandlerFunc(scopeHandler.SaveAnalysis)))
	mux.Handle("DELETE /api/scopes/saved-analyses", requireAuth(http.HandlerFunc(scopeHandler.DeleteAnalysis)))
	mux.Handle("PUT /api/scopes/saved-analyses", requireAuth(http.HandlerFunc(scopeHandler.RenameAnalysis)))
	mux.Handle("GET /api/scopes/workspace", requireAuth(http.HandlerFunc(scopeHandler.GetScopeWorkspace)))

	// Notebooks endpoints (Protected by Auth middleware)
	mux.Handle("GET /api/notebooks", requireAuth(http.HandlerFunc(notebookHandler.GetNotebooks)))
	mux.Handle("GET /api/notebooks/{id}", requireAuth(http.HandlerFunc(notebookHandler.GetNotebook)))
	mux.Handle("POST /api/notebooks", requireAuth(http.HandlerFunc(notebookHandler.CreateNotebook)))
	mux.Handle("PUT /api/notebooks/{id}", requireAuth(http.HandlerFunc(notebookHandler.UpdateNotebook)))
	mux.Handle("DELETE /api/notebooks/{id}", requireAuth(http.HandlerFunc(notebookHandler.DeleteNotebook)))
	mux.Handle("PUT /api/notebooks/{id}/cells", requireAuth(http.HandlerFunc(notebookHandler.SaveCells)))

	// Text Analysis Engine endpoints
	mux.Handle("POST /api/analytics/analyze", requireAuth(http.HandlerFunc(analyticsHandler.Analyze)))
	mux.Handle("POST /api/analytics/compare", requireAuth(http.HandlerFunc(analyticsHandler.Compare)))

	// Gemini AI endpoints (Protected by Auth and specialized Rate Limiting)
	aiLimiter := middleware.NewIPRateLimiter(rate.Limit(15.0/3600.0), 5)
	aiRateLimit := middleware.RateLimitMiddleware(aiLimiter)

	mux.Handle("POST /api/ai/insight", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.GetInsight))))
	mux.Handle("POST /api/ai/tone", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.GetTone))))
	mux.Handle("POST /api/ai/deep-dive", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.GetDeepDive))))
	mux.Handle("POST /api/ai/original-study", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.GetOriginalStudy))))
	mux.Handle("POST /api/ai/search", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.AISearch))))
	mux.Handle("POST /api/ai/compare", requireAuth(aiRateLimit(http.HandlerFunc(aiHandler.GetComparison))))

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
		slog.Info("     POST  /api/translations/link  [protected]")
		slog.Info("     DELETE /api/translations/link [protected]")
		slog.Info("     POST  /api/scopes             [protected]")
		slog.Info("     GET   /api/scopes             [protected]")
		slog.Info("     DELETE /api/scopes            [protected]")
		slog.Info("     POST  /api/scopes/saved-searches [protected]")
		slog.Info("     POST  /api/scopes/saved-analyses [protected]")
		slog.Info("     GET   /api/scopes/workspace   [protected]")
		slog.Info("     GET   /api/notebooks          [protected]")
		slog.Info("     GET   /api/notebooks/{id}     [protected]")
		slog.Info("     POST  /api/notebooks          [protected]")
		slog.Info("     PUT   /api/notebooks/{id}     [protected]")
		slog.Info("     DELETE /api/notebooks/{id}    [protected]")
		slog.Info("     PUT   /api/notebooks/{id}/cells [protected]")
		slog.Info("     POST  /api/analytics/analyze")
		slog.Info("     POST  /api/analytics/compare")
		slog.Info("     POST  /api/ai/insight         [protected, rate-limited]")
		slog.Info("     POST  /api/ai/tone            [protected, rate-limited]")
		slog.Info("     POST  /api/ai/deep-dive       [protected, rate-limited]")
		slog.Info("     POST  /api/ai/original-study  [protected, rate-limited]")
		slog.Info("     POST  /api/ai/search          [protected, rate-limited]")
		slog.Info("     POST  /api/ai/compare         [protected, rate-limited]")
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
