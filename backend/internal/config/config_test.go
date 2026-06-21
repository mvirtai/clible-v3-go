package config

import (
	"testing"
)

// TestLoadDefaults verifies that configuration falls back to safe hardcoded options.
func TestLoadDefaults(t *testing.T) {
	// Clean potentially leaking local environments inside testing scope safely
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_PATH", "")

	cfg := Load()

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %s", cfg.Port)
	}
	if cfg.DBPath != "clible.db" {
		t.Errorf("expected default DB path clible.db, got %s", cfg.DBPath)
	}
}

// TestLoadCustom verifies that environment variables correctly override defaults.
func TestLoadCustom(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("DATABASE_PATH", "production_isolated.db")

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected custom port 9090, got %s", cfg.Port)
	}
	if cfg.DBPath != "production_isolated.db" {
		t.Errorf("expected custom DB path production_isolated.db, got %s", cfg.DBPath)
	}
}
