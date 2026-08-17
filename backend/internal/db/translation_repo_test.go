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

	// Test 4: Verify is_global defaults to TRUE for all new translations
	if !list[0].IsGlobal {
		t.Error("Expected is_global = TRUE for newly created translation, got FALSE")
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
	kjvTrans := models.Translation{ID: "kjv", Name: "King James Version", Language: "en", Format: "OSIS"}

	if err := repo.Create(webTrans); err != nil {
		t.Fatalf("Failed to create web translation: %v", err)
	}
	if err := repo.Create(finTrans); err != nil {
		t.Fatalf("Failed to create fin translation: %v", err)
	}
	if err := repo.Create(kjvTrans); err != nil {
		t.Fatalf("Failed to create kjv translation: %v", err)
	}

	userID := "test-user-id"
	_, err = db.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")
	if err != nil {
		t.Fatalf("Failed to insert mock user: %v", err)
	}

	// 1. GetAllWithInstalled: all three should appear, none installed yet
	catalog, err := repo.GetAllWithInstalled(ctx, userID)
	if err != nil {
		t.Fatalf("GetAllWithInstalled failed: %v", err)
	}
	if len(catalog) != 3 {
		t.Errorf("Expected 3 translations in catalog, got %d", len(catalog))
	}
	for _, tr := range catalog {
		if tr.Installed {
			t.Errorf("Expected translation %q to not be installed yet, but it is", tr.ID)
		}
	}

	// 2. IsAccessible: nothing is accessible yet (no user links)
	accessible, err := repo.IsAccessible(ctx, userID, "web")
	if err != nil || accessible {
		t.Errorf("Expected 'web' to be inaccessible before linking, got err: %v, accessible: %v", err, accessible)
	}

	// 3. LinkUser: link user to web and fin-1992
	if err := repo.LinkUser(ctx, userID, "web"); err != nil {
		t.Fatalf("LinkUser failed for 'web': %v", err)
	}
	if err := repo.LinkUser(ctx, userID, "fin-1992"); err != nil {
		t.Fatalf("LinkUser failed for 'fin-1992': %v", err)
	}

	// 4. GetAllWithInstalled: web and fin-1992 should now be installed, kjv not
	catalog, err = repo.GetAllWithInstalled(ctx, userID)
	if err != nil {
		t.Fatalf("GetAllWithInstalled failed after linking: %v", err)
	}
	installedCount := 0
	for _, tr := range catalog {
		if tr.Installed {
			installedCount++
		}
	}
	if installedCount != 2 {
		t.Errorf("Expected 2 installed translations, got %d", installedCount)
	}

	// 5. GetByUser: only linked translations returned
	linked, err := repo.GetByUser(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUser failed: %v", err)
	}
	if len(linked) != 2 {
		t.Errorf("Expected 2 linked translations from GetByUser, got %d", len(linked))
	}

	// 6. IsAccessible: web and fin-1992 should now be accessible
	accessible, err = repo.IsAccessible(ctx, userID, "web")
	if err != nil || !accessible {
		t.Errorf("Expected 'web' to be accessible after link, got err: %v, accessible: %v", err, accessible)
	}
	accessible, err = repo.IsAccessible(ctx, userID, "fin-1992")
	if err != nil || !accessible {
		t.Errorf("Expected 'fin-1992' to be accessible after link, got err: %v, accessible: %v", err, accessible)
	}
	// kjv should still be inaccessible
	accessible, err = repo.IsAccessible(ctx, userID, "kjv")
	if err != nil || accessible {
		t.Errorf("Expected 'kjv' to be inaccessible (not linked), got err: %v, accessible: %v", err, accessible)
	}

	// 7. UnlinkUser: unlink web
	if err := repo.UnlinkUser(ctx, userID, "web"); err != nil {
		t.Fatalf("UnlinkUser failed for 'web': %v", err)
	}
	accessible, err = repo.IsAccessible(ctx, userID, "web")
	if err != nil || accessible {
		t.Errorf("Expected 'web' to be inaccessible after unlink, got err: %v, accessible: %v", err, accessible)
	}

	// 8. Idempotent link: linking again should not fail
	if err := repo.LinkUser(ctx, userID, "web"); err != nil {
		t.Fatalf("Second LinkUser for 'web' failed (should be idempotent): %v", err)
	}
}

func TestTranslationRepository_LinkNonExistentTranslation(t *testing.T) {
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to set up database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := NewTranslationRepository(db)
	ctx := context.Background()

	userID := "test-user-id"
	_, _ = db.Exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", userID, "test@example.com", "hash")

	// Attempting to link a non-existent translation should return an error
	err = repo.LinkUser(ctx, userID, "does-not-exist")
	if err == nil {
		t.Error("Expected error when linking a non-existent translation, got nil")
	}
}

func TestTranslationRepository_Delete(t *testing.T) {
	db, err := InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to set up database connection: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := NewTranslationRepository(db)

	mockTrans := models.Translation{
		ID:       "to-delete",
		Name:     "To Delete Translation",
		Language: "en",
		Format:   "USFX",
	}

	if err := repo.Create(mockTrans); err != nil {
		t.Fatalf("failed to create translation: %v", err)
	}

	exists, err := repo.Exists("to-delete")
	if err != nil || !exists {
		t.Fatalf("expected translation to exist before delete")
	}

	if err := repo.Delete("to-delete"); err != nil {
		t.Fatalf("failed to delete translation: %v", err)
	}

	existsAfter, err := repo.Exists("to-delete")
	if err != nil {
		t.Fatalf("unexpected error checking existence: %v", err)
	}
	if existsAfter {
		t.Errorf("expected translation to no longer exist after delete")
	}
}

