# Ohjekirja: Lukukoneen viimeistely ja kirjaluettelon toteutus (Polku A)

Tämä ohjekirja opastaa sinua (kehittäjää) toteuttamaan Clible-v3-go:n lukukoneen puuttuvat ominaisuudet. Kaikki lähdekoodi ja kommentit on kirjoitettu englanniksi sääntöjen mukaisesti.

---

## Vaihe 1: `BookRepository` tietokantakerrokseen

Luodaan tiedosto `backend/internal/db/book_repo.go`, joka hoitaa `books`-taulun lukemisen.

```go
package db

import (
 "context"
 "database/sql"
 "fmtif err != nil {
  if err == sql.ErrNoRows {
   return nil, fmt.Errorf("book not found with id: %s", id)
  }
  return nil, fmt.Errorf("failed to query book by id: %w", err)
 }

 return &b, nil
"

 "github.com/mvirtai/clible-v3-go/internal/models"
)

// BookRepository handles data access operations for the books table.
type BookRepository struct {
 db *sql.DB
}

// NewBookRepository creates a new BookRepository instance.
func NewBookRepository(db *sql.DB) *BookRepository {
 return &BookRepository{db: db}
}

// GetAll retrieves all 66 canonical books ordered by their position.
func (r *BookRepository) GetAll(ctx context.Context) ([]models.Book, error) {
 rows, err := r.db.QueryContext(ctx, `
  SELECT id, name, testament, position, chapters
  FROM books
  ORDER BY position ASC
 `)
 if err != nil {
  return nil, fmt.Errorf("failed to query all books: %w", err)
 }
 defer func() { _ = rows.Close() }()

 var books []models.Book
 for rows.Next() {
  var b models.Book
  if err := rows.Scan(&b.ID, &b.Name, &b.Testament, &b.Position, &b.Chapters); err != nil {
   return nil, fmt.Errorf("failed to scan book row: %w", err)
  }
  books = append(books, b)
 }

 return books, rows.Err()
}

// GetByID retrieves a single book by its canonical ID (e.g. "GEN").
func (r *BookRepository) GetByID(ctx context.Context, id string) (*models.Book, error) {
 var b models.Book
 err := r.db.QueryRowContext(ctx, `
  SELECT id, name, testament, position, chapters
  FROM books
  WHERE id = ?
 `, id).Scan(&b.ID, &b.Name, &b.Testament, &b.Position, &b.Chapters)

 if err != nil {
  if err == sql.ErrNoRows {
   return nil, fmt.Errorf("book not found with id: %s", id)
  }
  return nil, fmt.Errorf("failed to query book by id: %w", err)
 }

 return &b, nil
}
```

---

## Vaihe 2: `VerseRepository` laajentaminen luku- ja kirjatason hauilla

Muokataan tiedostoa [verse_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/verse_repo.go). Lisätään sinne uudet metodit `GetByChapter` ja `GetByBook` luvun ja kirjan jakeiden hakemiseen.

Lisää tiedoston loppuun seuraavat kaksi metodia (varmista, että kommentit ovat englanniksi):

```go
// GetByChapter fetches all verses for a given chapter, translation, and book.
func (r *VerseRepository) GetByChapter(ctx context.Context, translationID, bookID string, chapter int) ([]models.Verse, error) {
 rows, err := r.db.QueryContext(ctx, `
  SELECT id, translation_id, book_id, chapter, verse, text
  FROM verses
  WHERE translation_id = ? AND book_id = ? AND chapter = ?
  ORDER BY verse ASC
 `, translationID, bookID, chapter)
 if err != nil {
  return nil, fmt.Errorf("chapter lookup failed: %w", err)
 }
 defer func() { _ = rows.Close() }()

 var verses []models.Verse
 for rows.Next() {
  var v models.Verse
  if err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); err != nil {
   return nil, fmt.Errorf("failed to scan verse row: %w", err)
  }
  verses = append(verses, v)
 }
 return verses, rows.Err()
}

// GetByBook fetches all verses for an entire book and translation, ordered by chapter and verse.
func (r *VerseRepository) GetByBook(ctx context.Context, translationID, bookID string) ([]models.Verse, error) {
 rows, err := r.db.QueryContext(ctx, `
  SELECT id, translation_id, book_id, chapter, verse, text
  FROM verses
  WHERE translation_id = ? AND book_id = ?
  ORDER BY chapter ASC, verse ASC
 `, translationID, bookID)
 if err != nil {
  return nil, fmt.Errorf("book lookup failed: %w", err)
 }
 defer func() { _ = rows.Close() }()

 var verses []models.Verse
 for rows.Next() {
  var v models.Verse
  if err := rows.Scan(&v.ID, &v.TranslationID, &v.BookID, &v.Chapter, &v.Verse, &v.Text); err != nil {
   return nil, fmt.Errorf("failed to scan verse row: %w", err)
  }
  verses = append(verses, v)
 }
 return verses, rows.Err()
}
```

---

## Vaihe 3: `BookService` palvelukerrokseen

Luodaan tiedosto `backend/internal/services/book_service.go`.

```go
package services

import (
 "context"

 "github.com/mvirtai/clible-v3-go/internal/db"
 "github.com/mvirtai/clible-v3-go/internal/models"
)

// BookService provides domain logic for querying book metadata.
type BookService struct {
 bookRepo *db.BookRepository
}

// NewBookService creates a new BookService instance.
func NewBookService(bookRepo *db.BookRepository) *BookService {
 return &BookService{bookRepo: bookRepo}
}

// GetAllBooks retrieves all books from the database.
func (s *BookService) GetAllBooks(ctx context.Context) ([]models.Book, error) {
 return s.bookRepo.GetAll(ctx)
}

// GetBookByID retrieves a book by its canonical ID.
func (s *BookService) GetBookByID(ctx context.Context, id string) (*models.Book, error) {
 return s.bookRepo.GetByID(ctx, id)
}
```

---

## Vaihe 4: `VerseService.GetVerses` päivittäminen

Muokataan tiedostoa [verse_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service.go). Päivitetään siellä dynaaminen oletuskäännöksen resolvointi ja otetaan käyttöön uudet haarat `ScopeChapter` ja `ScopeBook`.

Korvaa olemassa oleva `GetVerses`-metodi (rivit 48–81) tällä toteutuksella:

```go
// GetVerses resolves a raw text reference string and fetches matching records from the database.
// This is a web-first replacement for python subprocess wrappers, returning JSON-ready slices instantly.
func (s *VerseService) GetVerses(ctx context.Context, reference string, translationID string) ([]models.Verse, error) {

 // 1. Resolve reference bounds using an internal parsing utility
 parsed, err := parser.ParseReference(reference)
 if err != nil {
  return nil, fmt.Errorf("failed to parse reference via engine: %w", err)
 }

 // 2. Resolve fallback translation id if the frontend did not provide an explicit ID.
 tid := translationID
 if tid == "" {
  // Fetch all installed translations and select the first one as default
  installed, err := s.translationRepo.GetAll(ctx)
  if err == nil && len(installed) > 0 {
   tid = installed[0].ID
  } else {
   tid = "fin-1992" // Fallback default
  }
 }

 // 3. Coordinate data retrieval based on the resolved query scope
 switch parsed.Scope {
 case parser.ScopeVerse:
  return s.verseRepo.GetByReference(ctx, tid, parsed.BookName, parsed.Chapter, parsed.VerseStart, parsed.VerseEnd)

 case parser.ScopeChapter:
  return s.verseRepo.GetByChapter(ctx, tid, parsed.BookName, parsed.Chapter)

 case parser.ScopeBook:
  return s.verseRepo.GetByBook(ctx, tid, parsed.BookName)
 }

 return nil, fmt.Errorf("unsupported reference scope triggered")
}
```

---

## Vaihe 5: `BookHandler` luominen API-kerrokseen

Luodaan tiedosto `backend/internal/api/book_handler.go`. Se käyttää uutta standardia Go 1.22:n `r.PathValue("id")` -tukea polkuwildcardille.

```go
package api

import (
 "encoding/json"
 "net/http"

 "github.com/mvirtai/clible-v3-go/internal/services"
)

// BookHandler handles presentation controller boundaries for book metadata.
type BookHandler struct {
 bookService *services.BookService
}

// NewBookHandler creates a new BookHandler instance.
func NewBookHandler(bs *services.BookService) *BookHandler {
 return &BookHandler{bookService: bs}
}

// GetBooks handles GET /api/books to return a list of all canonical books.
func (h *BookHandler) GetBooks(w http.ResponseWriter, r *http.Request) {
 ctx := r.Context()
 w.Header().Set("Content-Type", "application/json")

 books, err := h.bookService.GetAllBooks(ctx)
 if err != nil {
  w.WriteHeader(http.StatusInternalServerError)
  _ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to retrieve books: " + err.Error()})
  return
 }

 w.WriteHeader(http.StatusOK)
 _ = json.NewEncoder(w).Encode(books)
}

// GetBookByID handles GET /api/books/{id} to return details of a single book.
func (h *BookHandler) GetBookByID(w http.ResponseWriter, r *http.Request) {
 ctx := r.Context()
 w.Header().Set("Content-Type", "application/json")

 // Read path parameter natively using Go 1.22+ PathValue support
 id := r.PathValue("id")
 if id == "" {
  w.WriteHeader(http.StatusBadRequest)
  _ = json.NewEncoder(w).Encode(map[string]string{"error": "missing book id path parameter"})
  return
 }

 book, err := h.bookService.GetBookByID(ctx, id)
 if err != nil {
  w.WriteHeader(http.StatusNotFound)
  _ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
  return
 }

 w.WriteHeader(http.StatusOK)
 _ = json.NewEncoder(w).Encode(book)
}
```

---

## Vaihe 6: API-reittien rekisteröinti `backend/main.go`-tiedostossa

Muokataan tiedostoa [main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go) ottamalla käyttöön uudet komponentit ja reitit.

### 1. Rekisteröi uusi BookRepository main-funktiossa (rivin 42 jälkeen)

```go
 bookRepo := db.NewBookRepository(dbConn)
```

### 2. Rekisteröi uusi BookService main-funktiossa (rivin 47 jälkeen)

```go
 bookService := services.NewBookService(bookRepo)
```

### 3. Rekisteröi uusi BookHandler main-funktiossa (rivin 62 jälkeen)

```go
 bookHandler := api.NewBookHandler(bookService)
```

### 4. Lisää uudet API-reitit ServeMuxiin (rivin 68 jälkeen)

```go
 // Book metadata endpoints
 mux.HandleFunc("GET /api/books", bookHandler.GetBooks)
 mux.HandleFunc("GET /api/books/{id}", bookHandler.GetBookByID)
```

---

## Vaihe 7: Testien kirjoittaminen ja ajaminen

Lopuksi on tärkeää luoda testit ja ajaa ne nollatoleranssilla virheille.

1. Luo yksikkötestit tiedostoihin:
   * `backend/internal/db/book_repo_test.go`
   * `backend/internal/services/book_service_test.go`
   * `backend/internal/api/book_handler_test.go`
2. Laajenna `backend/internal/services/verse_service_test.go` kattamaan uudet luku- ja kirjatason haut.
3. Aja testit komennolla:

   ```bash
   task backend:test
   ```
