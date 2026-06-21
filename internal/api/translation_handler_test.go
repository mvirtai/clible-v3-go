package api_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/parsers"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func TestTranslationHandler_Endpoints(t *testing.T) {
	t.Run("GET /api/translations returns 200 OK with catalog array", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		xmlParser := parsers.NewXMLVerseParser()
		verseRepo := db.NewVerseRepository(conn)
		seedService := services.NewSeedService(verseRepo, xmlParser)

		err = repo.Create(models.Translation{
			ID:       "fin-1992",
			Name:     "Finnish 1992",
			Language: "fi",
			Format:   "text",
		})
		if err != nil {
			t.Fatalf("failed to seed translation: %v", err)
		}

		handler := api.NewTranslationHandler(repo, seedService)

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		rec := httptest.NewRecorder()

		handler.GetTranslations(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected HTTP 200 OK, got %d", rec.Code)
		}
	})

	t.Run("GET /api/translations returns 500 Internal Server Error on database failure", func(t *testing.T) {
		connErr, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		repoErr := db.NewTranslationRepository(connErr)
		xmlParser := parsers.NewXMLVerseParser()
		verseRepo := db.NewVerseRepository(connErr)
		seedService := services.NewSeedService(verseRepo, xmlParser)
		handlerErr := api.NewTranslationHandler(repoErr, seedService)

		_ = connErr.Close()

		req := httptest.NewRequest(http.MethodGet, "/api/translations", nil)
		rec := httptest.NewRecorder()

		handlerErr.GetTranslations(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Errorf("expected HTTP 500 Internal Server Error, got %d", rec.Code)
		}
	})

	t.Run("POST /api/translations/import successfully streams multipart XML data into database", func(t *testing.T) {
		conn, err := db.InitializeDB(":memory:")
		if err != nil {
			t.Fatalf("failed to boot test database: %v", err)
		}
		defer func() { _ = conn.Close() }()

		repo := db.NewTranslationRepository(conn)
		xmlParser := parsers.NewXMLVerseParser()
		verseRepo := db.NewVerseRepository(conn)
		seedService := services.NewSeedService(verseRepo, xmlParser)
		handler := api.NewTranslationHandler(repo, seedService)

		// Seed required FK parent book row
		_, _ = conn.Exec(`INSERT INTO books (id, name, testament, position, chapters) VALUES ('GEN', 'Genesis', 'OT', 1, 50)`)

		// Set up dynamic multi-part buffered body byte vectors
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		_ = writer.WriteField("translationId", "web-import")
		_ = writer.WriteField("name", "World English Import")
		_ = writer.WriteField("language", "en")

		part, err := writer.CreateFormFile("file", "test_bible.xml")
		if err != nil {
			t.Fatalf("failed to initialize virtual multi-part file block: %v", err)
		}

		usfxMock := `<usfx><book id="GEN"><c id="1"><v id="1">Light emerged.</v></c></book></usfx>`
		_, _ = part.Write([]byte(usfxMock))
		_ = writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/translations/import", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rec := httptest.NewRecorder()

		handler.ImportTranslation(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected HTTP 201 Created, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("POST /api/translations/import returns 400 on missing parameter headers", func(t *testing.T) {
		conn, _ := db.InitializeDB(":memory:")
		defer func() { _ = conn.Close() }()
		repo := db.NewTranslationRepository(conn)
		xmlParser := parsers.NewXMLVerseParser()
		verseRepo := db.NewVerseRepository(conn)
		seedService := services.NewSeedService(verseRepo, xmlParser)
		handler := api.NewTranslationHandler(repo, seedService)

		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		_ = writer.WriteField("translationId", "") // Invalid blank entry parameter trigger
		_ = writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/translations/import", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rec := httptest.NewRecorder()

		handler.ImportTranslation(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected HTTP 400 Bad Request, got %d", rec.Code)
		}
	})
}
