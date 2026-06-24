package db

import (
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

	var translations []models.Translation
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
	VALUES (?, ?, ?, ?, ?);
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
	query := "SELECT EXISTS(SELECT 1 FROM translations WHERE id = ?)"
	err := r.db.QueryRow(query, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check translation existence: %w", err)
	}
	return exists, nil
}

// Delete removes a translation metadata record (and cascades to verses).
func (r *TranslationRepository) Delete(id string) error {
	query := "DELETE FROM translations WHERE id = ?"
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete translation: %w", err)
	}
	return nil
}

