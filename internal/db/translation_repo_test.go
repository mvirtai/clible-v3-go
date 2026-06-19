package db

import (
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/models"
)

func TestTranslationRepository_CreateAndGetAll(t *testing.T) {
	// Setup a clean isolated in-memory context for this test case
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to set up database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := NewTranslationRepository(db)

	// Construct a dummy translation record matching our model domain
	mockTranslation := models.Translation{
		ID:        "web",
		Name:      "World English Bible",
		Language:  "en",
		Format:    "USFX",
		SourceURL: "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-web.usfx.xml",
	}

	// Test 1: Ensure creating a new record succeeds
	err = repo.Create(mockTranslation)
	if err != nil {
		t.Fatalf("Failed to create translation record: %v", err)
	}

	// Test 2: Verify the record existence validation works accurately
	exists, err := repo.Exists("web")
	if err != nil {
		t.Fatalf("Failed to check translation record existence: %v", err)
	}
	if !exists {
		t.Error("Expected translation 'web' to exist in database, but it was not found")
	}

	// Test 3: Verify retrieving records returns accurate data and count
	list, err := repo.GetAll()
	if err != nil {
		t.Fatalf("Failed to fetch all translations from database: %v", err)
	}

	if len(list) != 1 {
		t.Fatalf("Expected exactly 1 translation record in database, got %d", len(list))
	}

	if list[0].ID != mockTranslation.ID || list[0].Name != mockTranslation.Name {
		t.Errorf("Data mismatch in scanned row. Expected ID %s and Name %s, got %s and %s",
			mockTranslation.ID, mockTranslation.Name, list[0].ID, list[0].Name)
	}
}
