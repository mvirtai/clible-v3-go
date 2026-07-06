package db

import (
	"context"
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

	// Test 0: Verify GetAll returns an empty list (non-nil) when database is empty
	emptyList, err := repo.GetAll()
	if err != nil {
		t.Fatalf("Failed to fetch all translations on empty database: %v", err)
	}
	if emptyList == nil {
		t.Error("Expected empty slice on empty database, got nil")
	}
	if len(emptyList) != 0 {
		t.Errorf("Expected exactly 0 translations on empty database, got %d", len(emptyList))
	}

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

func TestTranslationRepository_UserMapping(t *testing.T) {
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to set up database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := NewTranslationRepository(db)
	ctx := context.Background()

	// Install a couple of translations globally
	webTrans := models.Translation{ID: "web", Name: "World English Bible", Language: "en", Format: "USFX"}
	finTrans := models.Translation{ID: "fin-1992", Name: "Finnish 1992", Language: "fi", Format: "USFX"}
	customTrans := models.Translation{ID: "custom-1", Name: "Custom Translation", Language: "fi", Format: "USFX"}

	if err := repo.Create(webTrans); err != nil {
		t.Fatalf("Failed to create web translation: %v", err)
	}
	if err := repo.Create(finTrans); err != nil {
		t.Fatalf("Failed to create fin translation: %v", err)
	}
	if err := repo.Create(customTrans); err != nil {
		t.Fatalf("Failed to create custom translation: %v", err)
	}

	userID := "test-user-id"
	_, err = db.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")
	if err != nil {
		t.Fatalf("Failed to insert mock user: %v", err)
	}

	// 1. GetByUser: web should be accessible, other translations should not be (yet)
	list, err := repo.GetByUser(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUser failed: %v", err)
	}
	if len(list) != 1 || list[0].ID != "web" {
		t.Errorf("Expected only 'web' to be returned, got %d items", len(list))
	}

	// 2. IsAccessible: web is accessible by default
	accessible, err := repo.IsAccessible(ctx, userID, "web")
	if err != nil || !accessible {
		t.Errorf("Expected 'web' to be accessible, got err: %v, accessible: %v", err, accessible)
	}

	// custom-1 and fin-1992 are not accessible yet (no user link, and fin-1992 is not a fixed preset anymore)
	accessible, err = repo.IsAccessible(ctx, userID, "custom-1")
	if err != nil || accessible {
		t.Errorf("Expected 'custom-1' to be inaccessible, got err: %v, accessible: %v", err, accessible)
	}

	accessible, err = repo.IsAccessible(ctx, userID, "fin-1992")
	if err != nil || accessible {
		t.Errorf("Expected 'fin-1992' to be inaccessible, got err: %v, accessible: %v", err, accessible)
	}

	// 3. LinkUser: Link user to custom-1 and fin-1992
	err = repo.LinkUser(ctx, userID, "custom-1")
	if err != nil {
		t.Fatalf("LinkUser failed: %v", err)
	}
	err = repo.LinkUser(ctx, userID, "fin-1992")
	if err != nil {
		t.Fatalf("LinkUser failed: %v", err)
	}

	// 4. GetByUser should now return web, custom-1, and fin-1992
	list, err = repo.GetByUser(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUser failed: %v", err)
	}
	if len(list) != 3 {
		t.Errorf("Expected 3 translations, got %d", len(list))
	}

	// 5. IsAccessible: custom-1 and fin-1992 should now be accessible
	accessible, err = repo.IsAccessible(ctx, userID, "custom-1")
	if err != nil || !accessible {
		t.Errorf("Expected 'custom-1' to be accessible after link, got err: %v, accessible: %v", err, accessible)
	}
	accessible, err = repo.IsAccessible(ctx, userID, "fin-1992")
	if err != nil || !accessible {
		t.Errorf("Expected 'fin-1992' to be accessible after link, got err: %v, accessible: %v", err, accessible)
	}
}

