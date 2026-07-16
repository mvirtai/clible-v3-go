package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

type TranslationRepository struct {
	db *sql.DB
}

// NewTranslationRepository constructs a isolated data-access component for translations.
func NewTranslationRepository(db *sql.DB) *TranslationRepository {
	return &TranslationRepository{db: db}
}

// GetAllWithInstalled returns all global translations, each annotated with whether
// the given user has activated (linked) that translation.
// This is the primary catalog endpoint for the frontend listing.
func (r *TranslationRepository) GetAllWithInstalled(ctx context.Context, userID string) ([]models.Translation, error) {
	query := `
		SELECT t.id, t.name, t.language, t.format, t.source_url, t.installed_at, t.is_global,
		       EXISTS(
		           SELECT 1 FROM user_translations ut
		           WHERE ut.user_id = $1 AND ut.translation_id = t.id
		       ) AS installed
		FROM translations t
		WHERE t.is_global = TRUE
		ORDER BY t.installed_at
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query translations catalog for user: %w", err)
	}
	defer func() { _ = rows.Close() }()

	translations := []models.Translation{}
	for rows.Next() {
		var t models.Translation
		err := rows.Scan(&t.ID, &t.Name, &t.Language, &t.Format, &t.SourceURL, &t.InstalledAt, &t.IsGlobal, &t.Installed)
		if err != nil {
			return nil, fmt.Errorf("failed to scan translation row: %w", err)
		}
		translations = append(translations, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during translation row iteration: %w", err)
	}

	return translations, nil
}

// GetByUser returns translations that the specified user has actively linked/installed.
// Used internally for permission checks in verse lookups.
func (r *TranslationRepository) GetByUser(ctx context.Context, userID string) ([]models.Translation, error) {
	query := `
		SELECT t.id, t.name, t.language, t.format, t.source_url, t.installed_at, t.is_global
		FROM translations t
		WHERE t.is_global = TRUE
		  AND t.id IN (SELECT translation_id FROM user_translations WHERE user_id = $1)
		ORDER BY t.installed_at
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query translations for user: %w", err)
	}
	defer func() { _ = rows.Close() }()

	translations := []models.Translation{}
	for rows.Next() {
		var t models.Translation
		err := rows.Scan(&t.ID, &t.Name, &t.Language, &t.Format, &t.SourceURL, &t.InstalledAt, &t.IsGlobal)
		if err != nil {
			return nil, fmt.Errorf("failed to scan translation row: %w", err)
		}
		translations = append(translations, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during translation row iteration for user: %w", err)
	}

	return translations, nil
}

// IsAccessible checks if the user has activated the given global translation.
// A translation is accessible only if it is global AND the user has explicitly linked it.
func (r *TranslationRepository) IsAccessible(ctx context.Context, userID, translationID string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM translations t
			JOIN user_translations ut ON ut.translation_id = t.id
			WHERE t.id = $2 AND ut.user_id = $1 AND t.is_global = TRUE
		)
	`
	err := r.db.QueryRowContext(ctx, query, userID, translationID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check translation accessibility: %w", err)
	}
	return exists, nil
}

// LinkUser activates a global translation for a user by inserting into user_translations.
// Idempotent: silently ignores conflicts if the link already exists.
func (r *TranslationRepository) LinkUser(ctx context.Context, userID, translationID string) error {
	// First verify that the translation exists and is global
	var isGlobal bool
	err := r.db.QueryRowContext(ctx,
		"SELECT is_global FROM translations WHERE id = $1",
		translationID,
	).Scan(&isGlobal)
	if err == sql.ErrNoRows {
		return fmt.Errorf("translation %q not found", translationID)
	}
	if err != nil {
		return fmt.Errorf("failed to verify translation: %w", err)
	}
	if !isGlobal {
		return fmt.Errorf("translation %q is not a global preset and cannot be linked", translationID)
	}

	query := `
		INSERT INTO user_translations (user_id, translation_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, translation_id) DO NOTHING
	`
	_, err = r.db.ExecContext(ctx, query, userID, translationID)
	if err != nil {
		return fmt.Errorf("failed to link user to translation: %w", err)
	}
	return nil
}

// UnlinkUser deactivates a global translation for a user by removing from user_translations.
func (r *TranslationRepository) UnlinkUser(ctx context.Context, userID, translationID string) error {
	query := "DELETE FROM user_translations WHERE user_id = $1 AND translation_id = $2"
	_, err := r.db.ExecContext(ctx, query, userID, translationID)
	if err != nil {
		return fmt.Errorf("failed to unlink user from translation: %w", err)
	}
	return nil
}

// GetAll returns all installed translations ordered by installation timestamp.
// Used internally for admin operations and seeding.
func (r *TranslationRepository) GetAll() ([]models.Translation, error) {
	query := `
	SELECT id, name, language, format, source_url, installed_at, is_global
	FROM translations
	ORDER BY installed_at
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query translations: %w", err)
	}
	defer func() { _ = rows.Close() }()

	translations := []models.Translation{}
	for rows.Next() {
		var t models.Translation
		err := rows.Scan(&t.ID, &t.Name, &t.Language, &t.Format, &t.SourceURL, &t.InstalledAt, &t.IsGlobal)
		if err != nil {
			return nil, fmt.Errorf("failed to scan translation row: %w", err)
		}
		translations = append(translations, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate translation rows: %w", err)
	}

	return translations, nil
}

// Create inserts a new global translation metadata record into the database.
// Internal use only – not exposed via HTTP endpoints.
func (r *TranslationRepository) Create(t models.Translation) error {
	query := `
	INSERT INTO translations (id, name, language, format, source_url, is_global)
	VALUES ($1, $2, $3, $4, $5, TRUE);
	`
	_, err := r.db.Exec(query, t.ID, t.Name, t.Language, t.Format, t.SourceURL)
	if err != nil {
		return fmt.Errorf("failed to insert new translation: %w", err)
	}
	return nil
}

// Exists checks if a given translation ID has already been installed.
func (r *TranslationRepository) Exists(id string) (bool, error) {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM translations WHERE id = $1)"
	err := r.db.QueryRow(query, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check translation existence: %w", err)
	}
	return exists, nil
}

// Delete removes a translation metadata record (and cascades to verses).
// Internal use only.
func (r *TranslationRepository) Delete(id string) error {
	query := "DELETE FROM translations WHERE id = $1"
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete translation: %w", err)
	}
	return nil
}
