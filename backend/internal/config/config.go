package config

import "os"

// Config holds all environmental runtime settings for the application
type Config struct {
	Port       string
	DBPath      string
	FrontendDir string
}

// Load read configuration from environment variables or applies fallback defaults.
func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "clible.db"
	}

	frontendDir := os.Getenv("FRONTEND_DIR")
	if frontendDir == "" {
		frontendDir = "../frontend/dist"
	}

	return &Config{
		Port:       port,
		DBPath:      dbPath,
		FrontendDir: frontendDir,
	}
}
