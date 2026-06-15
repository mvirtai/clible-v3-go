package main

import (
	"log"
	"net/http"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/api"
)

func main() {
	// 1. Initialize our API handler layer
	bibleHandler := api.NewBibleHandler()

	// 2. Setup the global multiplexer (router)
	mux := http.NewServeMux()

	// 3. Register our REST endpoints using explicit methods (Go 1.22+ routing feature)
	mux.HandleFunc("GET /api/verses", bibleHandler.GetVersesByReference)

	// 4. Configure the HTTP Server production flags for timeout safety
	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("Programmatic server simulation running directly inside unified Go process on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server orchestration failed: %v", err)
	}
}
