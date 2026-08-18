package config

import (
	"testing"
)

// TestLoadDefaults verifies that configuration falls back to safe hardcoded options.
func TestLoadDefaults(t *testing.T) {
	// Clean potentially leaking local environments inside testing scope safely
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_URL", "")

	cfg := Load()

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %s", cfg.Port)
	}
	expectedDefault := "clible.db"
	if cfg.DatabaseURL != expectedDefault {
		t.Errorf("expected default DB URL %s, got %s", expectedDefault, cfg.DatabaseURL)
	}
	if cfg.GeminiModelInsight != "gemini-3.7-flash" {
		t.Errorf("expected default insight model gemini-3.7-flash, got %s", cfg.GeminiModelInsight)
	}
	if cfg.GeminiModelTone != "gemini-3.7-flash" {
		t.Errorf("expected default tone model gemini-3.7-flash, got %s", cfg.GeminiModelTone)
	}
}

// TestLoadCustom verifies that environment variables correctly override defaults.
func TestLoadCustom(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/custom_db?sslmode=disable")
	t.Setenv("GEMINI_MODEL_INSIGHT", "custom-insight-model")
	t.Setenv("GEMINI_MODEL_TONE", "custom-tone-model")

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected custom port 9090, got %s", cfg.Port)
	}
	expectedCustom := "postgres://postgres:postgres@localhost:5432/custom_db?sslmode=disable"
	if cfg.DatabaseURL != expectedCustom {
		t.Errorf("expected custom DB URL %s, got %s", expectedCustom, cfg.DatabaseURL)
	}
	if cfg.GeminiModelInsight != "custom-insight-model" {
		t.Errorf("expected custom-insight-model, got %s", cfg.GeminiModelInsight)
	}
	if cfg.GeminiModelTone != "custom-tone-model" {
		t.Errorf("expected custom-tone-model, got %s", cfg.GeminiModelTone)
	}
}
