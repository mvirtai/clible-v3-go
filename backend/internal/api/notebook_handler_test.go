package api_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mvirtai/clible-v3-go/internal/api"
	"github.com/mvirtai/clible-v3-go/internal/db"
	"github.com/mvirtai/clible-v3-go/internal/middleware"
	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

func setupHandlerTestDB(t *testing.T) *sql.DB {
	conn, err := db.InitializeDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	return conn
}

func seedHandlerTestUser(t *testing.T, conn *sql.DB, userID string) {
	ctx := context.Background()
	_, err := conn.ExecContext(ctx,
		`INSERT INTO users (id, email, password_hash, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?)`,
		userID, userID+"@example.com", "hash", time.Now().UTC(), time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
}

func seedHandlerTestScope(t *testing.T, conn *sql.DB, userID, scopeID string) {
	ctx := context.Background()
	_, err := conn.ExecContext(ctx,
		`INSERT INTO scopes (id, name, user_id, created_at) 
		 VALUES (?, ?, ?, ?)`,
		scopeID, "Test Scope", userID, time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to seed scope: %v", err)
	}
}

// contextWithUserID attaches a userID to the request context (simulating auth middleware).
func contextWithUserID(userID string) context.Context {
	return context.WithValue(context.Background(), middleware.UserIDKey, userID)
}

// makeRequest is a helper to make HTTP requests to handler functions.
func makeRequest(t *testing.T, method, path string, body interface{}, userID string, handler http.HandlerFunc) *httptest.ResponseRecorder {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(bodyBytes))
	if userID != "" {
		req = req.WithContext(contextWithUserID(userID))
	}
	req.Header.Set("Content-Type", "application/json")

	// Parse 'id' path value from path, e.g. /api/notebooks/{id} or /api/notebooks/{id}/cells
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
	if len(parts) >= 3 && parts[2] != "" {
		req.SetPathValue("id", parts[2])
	}

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	return w
}

func TestNotebookHandler_GetNotebooks(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)

	ctx := context.Background()
	_, _ = service.CreateNotebook(ctx, "Notebook 1", userID, "")
	_, _ = service.CreateNotebook(ctx, "Notebook 2", userID, "")

	t.Run("returns list of notebooks for authenticated user", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks", nil, userID, handler.GetNotebooks)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var notebooks []models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&notebooks); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(notebooks) != 2 {
			t.Errorf("expected 2 notebooks, got %d", len(notebooks))
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/notebooks", nil)
		w := httptest.NewRecorder()
		handler.GetNotebooks(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("returns 405 for non-GET methods", func(t *testing.T) {
		w := makeRequest(t, http.MethodPost, "/api/notebooks", nil, userID, handler.GetNotebooks)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", w.Code)
		}
	})

	t.Run("returns empty array for user with no notebooks", func(t *testing.T) {
		newUserID := uuid.New().String()
		seedHandlerTestUser(t, conn, newUserID)

		w := makeRequest(t, http.MethodGet, "/api/notebooks", nil, newUserID, handler.GetNotebooks)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var notebooks []models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&notebooks); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(notebooks) != 0 {
			t.Errorf("expected 0 notebooks, got %d", len(notebooks))
		}
	})
}

func TestNotebookHandler_GetNotebook(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)
	seedHandlerTestUser(t, conn, otherUserID)

	ctx := context.Background()
	nb, _ := service.CreateNotebook(ctx, "My Notebook", userID, "")

	t.Run("returns notebook for owner", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks/"+nb.ID, nil, userID, handler.GetNotebook)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var retrieved models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&retrieved); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if retrieved.ID != nb.ID {
			t.Errorf("expected ID %q, got %q", nb.ID, retrieved.ID)
		}
		if retrieved.Title != "My Notebook" {
			t.Errorf("expected title 'My Notebook', got %q", retrieved.Title)
		}
	})

	t.Run("returns 403 for unauthorized user", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks/"+nb.ID, nil, otherUserID, handler.GetNotebook)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", w.Code)
		}
	})

	t.Run("returns 404 for non-existent notebook", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks/non-existent-id", nil, userID, handler.GetNotebook)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", w.Code)
		}
	})

	t.Run("returns 400 when ID is missing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/notebooks/", nil)
		req = req.WithContext(contextWithUserID(userID))
		w := httptest.NewRecorder()
		handler.GetNotebook(w, req)

		// PathValue returns "" when path param is not found
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/notebooks/"+nb.ID, nil)
		w := httptest.NewRecorder()
		handler.GetNotebook(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})
}

func TestNotebookHandler_CreateNotebook(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	scopeID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)
	seedHandlerTestScope(t, conn, userID, scopeID)

	t.Run("creates notebook with valid payload", func(t *testing.T) {
		payload := map[string]string{
			"title":   "New Notebook",
			"scopeId": "",
		}

		w := makeRequest(t, http.MethodPost, "/api/notebooks", payload, userID, handler.CreateNotebook)

		if w.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", w.Code)
		}

		var created models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if created.Title != "New Notebook" {
			t.Errorf("expected title 'New Notebook', got %q", created.Title)
		}
		if created.UserID != userID {
			t.Errorf("expected userID %q, got %q", userID, created.UserID)
		}
	})

	t.Run("creates notebook with scope", func(t *testing.T) {
		payload := map[string]string{
			"title":   "Scoped Notebook",
			"scopeId": scopeID,
		}

		w := makeRequest(t, http.MethodPost, "/api/notebooks", payload, userID, handler.CreateNotebook)

		if w.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", w.Code)
		}

		var created models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if created.ScopeID != scopeID {
			t.Errorf("expected scopeID %q, got %q", scopeID, created.ScopeID)
		}
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/notebooks", bytes.NewReader([]byte("invalid json")))
		req = req.WithContext(contextWithUserID(userID))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateNotebook(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/notebooks", nil)
		w := httptest.NewRecorder()
		handler.CreateNotebook(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("returns 405 for non-POST methods", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks", nil, userID, handler.CreateNotebook)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", w.Code)
		}
	})
}

func TestNotebookHandler_UpdateNotebook(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	scopeID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)
	seedHandlerTestUser(t, conn, otherUserID)
	seedHandlerTestScope(t, conn, userID, scopeID)

	ctx := context.Background()
	nb, _ := service.CreateNotebook(ctx, "Original Title", userID, "")

	t.Run("successfully updates notebook", func(t *testing.T) {
		payload := map[string]string{
			"title":   "Updated Title",
			"scopeId": scopeID,
		}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/"+nb.ID, payload, userID, handler.UpdateNotebook)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var updated models.Notebook
		if err := json.NewDecoder(w.Body).Decode(&updated); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if updated.Title != "Updated Title" {
			t.Errorf("expected title 'Updated Title', got %q", updated.Title)
		}
	})

	t.Run("returns 404 for non-existent notebook", func(t *testing.T) {
		payload := map[string]string{"title": "Title"}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/non-existent", payload, userID, handler.UpdateNotebook)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", w.Code)
		}
	})

	t.Run("returns 403 for unauthorized user", func(t *testing.T) {
		payload := map[string]string{"title": "New Title"}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/"+nb.ID, payload, otherUserID, handler.UpdateNotebook)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", w.Code)
		}
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/notebooks/"+nb.ID, bytes.NewReader([]byte("invalid")))
		req = req.WithContext(contextWithUserID(userID))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.UpdateNotebook(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/notebooks/"+nb.ID, nil)
		w := httptest.NewRecorder()
		handler.UpdateNotebook(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})
}

func TestNotebookHandler_DeleteNotebook(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)
	seedHandlerTestUser(t, conn, otherUserID)

	ctx := context.Background()
	nb, _ := service.CreateNotebook(ctx, "To Delete", userID, "")

	t.Run("successfully deletes notebook", func(t *testing.T) {
		w := makeRequest(t, http.MethodDelete, "/api/notebooks/"+nb.ID, nil, userID, handler.DeleteNotebook)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		// Verify deletion
		_, err := service.GetNotebook(ctx, nb.ID, userID)
		if err == nil || err.Error() != "notebook not found" {
			t.Error("expected notebook to be deleted")
		}
	})

	t.Run("returns 404 for non-existent notebook", func(t *testing.T) {
		w := makeRequest(t, http.MethodDelete, "/api/notebooks/non-existent", nil, userID, handler.DeleteNotebook)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", w.Code)
		}
	})

	t.Run("returns 403 for unauthorized user", func(t *testing.T) {
		nb2, _ := service.CreateNotebook(ctx, "Another", userID, "")

		w := makeRequest(t, http.MethodDelete, "/api/notebooks/"+nb2.ID, nil, otherUserID, handler.DeleteNotebook)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", w.Code)
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/notebooks/some-id", nil)
		w := httptest.NewRecorder()
		handler.DeleteNotebook(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("returns 405 for non-DELETE methods", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks/some-id", nil, userID, handler.DeleteNotebook)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", w.Code)
		}
	})
}

func TestNotebookHandler_SaveCells(t *testing.T) {
	conn := setupHandlerTestDB(t)
	defer func() { _ = conn.Close() }()

	notebookRepo := db.NewNotebookRepository(conn)
	scopeRepo := db.NewScopeRepository(conn)
	service := services.NewNotebookService(notebookRepo, scopeRepo, nil)
	handler := api.NewNotebookHandler(service)

	userID := uuid.New().String()
	otherUserID := uuid.New().String()
	seedHandlerTestUser(t, conn, userID)
	seedHandlerTestUser(t, conn, otherUserID)

	ctx := context.Background()
	nb, _ := service.CreateNotebook(ctx, "Notebook", userID, "")

	t.Run("successfully saves cells", func(t *testing.T) {
		cells := []map[string]interface{}{
			{
				"id":         uuid.New().String(),
				"type":       "markdown",
				"content":    "# Title",
				"position":   0,
				"notebookId": nb.ID,
			},
			{
				"id":         uuid.New().String(),
				"type":       "code",
				"content":    "code()",
				"position":   1,
				"notebookId": nb.ID,
			},
		}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/"+nb.ID+"/cells", cells, userID, handler.SaveCells)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
		}

		// Verify cells were saved
		retrieved, _ := service.GetNotebookCells(ctx, nb.ID, userID)
		if len(retrieved) != 2 {
			t.Errorf("expected 2 cells, got %d", len(retrieved))
		}
	})

	t.Run("saves empty cell list", func(t *testing.T) {
		cells := []map[string]interface{}{}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/"+nb.ID+"/cells", cells, userID, handler.SaveCells)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("returns 403 for unauthorized user", func(t *testing.T) {
		cells := []map[string]interface{}{
			{
				"id":       uuid.New().String(),
				"type":     "markdown",
				"content":  "Content",
				"position": 0,
			},
		}

		w := makeRequest(t, http.MethodPut, "/api/notebooks/"+nb.ID+"/cells", cells, otherUserID, handler.SaveCells)

		if w.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", w.Code)
		}
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/notebooks/"+nb.ID+"/cells", bytes.NewReader([]byte("invalid")))
		req = req.WithContext(contextWithUserID(userID))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.SaveCells(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	t.Run("returns 401 when not authenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/notebooks/"+nb.ID+"/cells", nil)
		w := httptest.NewRecorder()
		handler.SaveCells(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", w.Code)
		}
	})

	t.Run("returns 405 for non-PUT methods", func(t *testing.T) {
		w := makeRequest(t, http.MethodGet, "/api/notebooks/"+nb.ID+"/cells", nil, userID, handler.SaveCells)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", w.Code)
		}
	})
}
