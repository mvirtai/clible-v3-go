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

// GetByUser returns translations accessible by the specified user (fixed + user-mapped translations)
func (r *TranslationRepository) GetByUser(ctx context.Context, userID string) ([]models.Translation, error) {
	query := `
		SELECT id, name, language, format, source_url, installed_at
		FROM translations
		WHERE id = 'web'
		   OR id IN (SELECT translation_id FROM user_translations WHERE user_id = $1)
		ORDER BY installed_at
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query translations for user: %w", err)
	}
	defer func() { _ = rows.Close() }()

	translations := []models.Translation{}
	for rows.Next() {
		var t models.Translation
		err := rows.Scan(&t.ID, &t.Name, &t.Language, &t.Format, &t.SourceURL, &t.InstalledAt)
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

// LinkUser links a translation to a user in user_translations
func (r *TranslationRepository) LinkUser(ctx context.Context, userID, translationID string) error {
	query := `
		INSERT INTO user_translations (user_id, translation_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, translation_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, userID, translationID)
	if err != nil {
		return fmt.Errorf("failed to link user to translation: %w", err)
	}
	return nil
}

// IsAccessible checks if the translation is accessible to the user (either it's a fixed preset or mapped to the user)
func (r *TranslationRepository) IsAccessible(ctx context.Context, userID, translationID string) (bool, error) {
	// Fixed translations are accessible to all authenticated users
	if translationID == "web" {
		var exists bool
		query := "SELECT EXISTS(SELECT 1 FROM translations WHERE id = $1)"
		err := r.db.QueryRowContext(ctx, query, translationID).Scan(&exists)
		if err != nil {
			return false, fmt.Errorf("failed to check translation existence: %w", err)
		}
		return exists, nil
	}

	var exists bool
	query := `
		SELECT EXISTS (
			SELECT 1 FROM user_translations 
			WHERE user_id = $1 AND translation_id = $2
		)
	`
	err := r.db.QueryRowContext(ctx, query, userID, translationID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check translation accessibility: %w", err)
	}
	return exists, nil
}

// NewTranslationRepository constructs a isolated data-access component for translations.
func NewTranslationRepository(db *sql.DB) *TranslationRepository {
	return &TranslationRepository{db: db}
}

// GetAll return all installed translations ordered by installation timestamp
func (r *TranslationRepository) GetAll() ([]models.Translation, error) {
	query := `
	SELECT id, name, language, format, source_url, installed_at
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
		// Scan matches database row columns cleanly directly into our struct fields
		err := rows.Scan(&t.ID, &t.Name, &t.Language, &t.Format, &t.SourceURL, &t.InstalledAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan translation row: %w", err)
		}
		translations = append(translations, t)
	}

	return translations, nil
}

// Create inserts a new translation metadata record into the database.
func (r *TranslationRepository) Create(t models.Translation) error {
	query := `
	INSERT INTO translations (id, name, language, format, source_url)
	VALUES ($1, $2, $3, $4, $5);
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
func (r *TranslationRepository) Delete(id string) error {
	query := "DELETE FROM translations WHERE id = $1"
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete translation: %w", err)
	}
	return nil
}

