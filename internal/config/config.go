package config

import "os"

// Config holds all environmental runtime settings for the application
type Config struct {
	Port   string
	DBPath string
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

	return &Config{
		Port:   port,
		DBPath: dbPath,
	}
}
