package config

import (
	"os"
	"strings"
)

// Config holds all environmental runtime settings for the application
type Config struct {
	Port                string
	DatabaseURL         string
	FrontendDir         string
	Env                 string
	GeminiAPIKey        string
	GeminiModelInsight  string
	GeminiModelTone     string
	GeminiModelOriginal string
	GeminiModelSearch   string
}

func cleanEnv(val string) string {
	val = strings.TrimSpace(val)
	if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
		return val[1 : len(val)-1]
	}
	return val
}

// Load read configuration from environment variables or applies fallback defaults.
func Load() *Config {
	geminiAPIKey := cleanEnv(os.Getenv("GEMINI_API_KEY"))

	modelInsight := cleanEnv(os.Getenv("GEMINI_MODEL_INSIGHT"))
	if modelInsight == "" {
		modelInsight = "gemini-3.5-flash-lite"
	}

	modelTone := cleanEnv(os.Getenv("GEMINI_MODEL_TONE"))
	if modelTone == "" {
		modelTone = "gemini-3.5-flash-lite"
	}

	modelOriginal := cleanEnv(os.Getenv("GEMINI_MODEL_ORIGINAL"))
	if modelOriginal == "" {
		modelOriginal = "gemini-3.1-flash-lite"
	}

	modelSearch := cleanEnv(os.Getenv("GEMINI_MODEL_SEARCH"))
	if modelSearch == "" {
		modelSearch = "gemini-3.1-flash-lite"
	}

	port := cleanEnv(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	databaseURL := cleanEnv(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		databaseURL = "clible.db"
	}

	frontendDir := cleanEnv(os.Getenv("FRONTEND_DIR"))
	if frontendDir == "" {
		frontendDir = "../frontend/dist"
	}

	env := cleanEnv(os.Getenv("ENV"))
	if env == "" {
		env = cleanEnv(os.Getenv("APP_ENV"))
	}
	if env == "" {
		env = "development"
	}

	return &Config{
		Port:                port,
		DatabaseURL:         databaseURL,
		FrontendDir:         frontendDir,
		Env:                 env,
		GeminiAPIKey:        geminiAPIKey,
		GeminiModelInsight:  modelInsight,
		GeminiModelTone:     modelTone,
		GeminiModelOriginal: modelOriginal,
		GeminiModelSearch:   modelSearch,
	}
}
