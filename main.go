package main

import (
	"log"
	"net/http"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func main() {
	// TODO: Verify the exact connection function name inside internal/db/connection.go
	// If it is named differently (e.g., db.Connect or db.InitDB), change it here.
	dbConn, err := db.InitializeDB("clible.db")
	if err != nil {
		log.Fatalf("Critical database boot initialization failed: %v", err)
	}
	defer dbConn.Close()

	// Initialize both repositories required by the synchronized services contract
	verseRepo := db.NewVerseRepository(dbConn)
	translationRepo := db.NewTranslationRepository(dbConn)

	// Fixes Error #3: Inject both initialized repositories into the service constructor
	verseService := services.NewVerseService(verseRepo, translationRepo)

	// Fixes Error #1 & #4: Use 'api' package prefix instead of the undefined 'handlers'
	bibleHandler := api.NewBibleHandler(verseService)

	// Setup the global multiplexer (router)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/verses", bibleHandler.GetVersesByReference)

	// Configure the HTTP Server production flags for timeout safety
	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("Unified Clible-v3 REST backend cleanly executing on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server orchestration failed: %v", err)
	}
}
