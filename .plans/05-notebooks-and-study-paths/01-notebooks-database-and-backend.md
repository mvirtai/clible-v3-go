# Suunnitelma 05A: Clible Notebooks — Tietomallit ja Go-backend

Tämä dokumentti ohjaa Clible Notebooks -ominaisuuden tietokantakerroksen, Go-palveluiden ja REST-rajapintojen (API) toteuttamista. Toteutus noudattaa Clible-v3-go:n tiukkoja kerrosrajapintoja (Repository -> Service -> API).

---

## 1. Tietokantamigraatiot (SQL)

Luodaan uusi PostgreSQL-yhteensopiva SQL-migraatiotiedosto `backend/migrations/012_notebooks.sql` (tai seuraava vapaa numero).

```sql
-- Up
CREATE TABLE notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scope_id UUID REFERENCES scopes(id) ON DELETE SET NULL
);

CREATE TYPE cell_type AS ENUM ('markdown', 'code');

CREATE TABLE notebook_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    type cell_type NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    result_json JSONB, -- Tallentaa koodisolun suoritusvaiheen tuloksen (esim. jakeet, analyysit)
    position INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notebooks_user ON notebooks(user_id);
CREATE INDEX idx_notebook_cells_notebook ON notebook_cells(notebook_id);
CREATE INDEX idx_notebook_cells_position ON notebook_cells(notebook_id, position);

-- Down
DROP TABLE IF EXISTS notebook_cells;
DROP TYPE IF EXISTS cell_type;
DROP TABLE IF EXISTS notebooks;
```

---

## 2. Mallit (Models)

Määritellään Go-rakenteet tiedostossa `backend/internal/models/notebook.go`:

```go
package models

import (
 "encoding/json"
 "time"

 "github.com/google/uuid"
)

type CellType string

const (
 CellTypeMarkdown CellType = "markdown"
 CellTypeCode     CellType = "code"
)

type Notebook struct {
 ID        uuid.UUID  `json:"id"`
 Title     string     `json:"title"`
 UserID    uuid.UUID  `json:"userId"`
 ScopeID   *uuid.UUID `json:"scopeId,omitempty"`
 CreatedAt time.Time  `json:"createdAt"`
 UpdatedAt time.Time  `json:"updatedAt"`
 Cells     []Cell     `json:"cells,omitempty"`
}

type Cell struct {
 ID         uuid.UUID       `json:"id"`
 NotebookID uuid.UUID       `json:"notebookId"`
 Type       CellType        `json:"type"`
 Content    string          `json:"content"`
 ResultJSON json.RawMessage `json:"resultJson,omitempty"`
 Position   int             `json:"position"`
 CreatedAt  time.Time       `json:"createdAt"`
 UpdatedAt  time.Time       `json:"updatedAt"`
}
```

---

## 3. Repositoriokerros (Repository Layer)

Luodaan `NotebookRepository` hoitamaan tietokantakyselyt (`backend/internal/db/notebook_repo.go`).

```go
package db

import (
 "context"
 "database/sql"
 "github.com/google/uuid"
 "github.com/mvirtai/clible-v3-go/internal/models"
)

type NotebookRepository interface {
 Create(ctx context.Context, nb *models.Notebook) error
 GetByID(ctx context.Context, id uuid.UUID) (*models.Notebook, error)
 GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Notebook, error)
 Update(ctx context.Context, nb *models.Notebook) error
 Delete(ctx context.Context, id uuid.UUID) error
 
 // Cell-kohtaiset metodit
 SaveCells(ctx context.Context, notebookID uuid.UUID, cells []models.Cell) error
 GetCells(ctx context.Context, notebookID uuid.UUID) ([]models.Cell, error)
}
```

*Huomautus: `SaveCells`-metodin tulee suorittaa operaatiot transaktiossa: poistaa vanhat solut ja lisätä uudet annetussa järjestyksessä.*

---

## 4. Palvelukerros (Service Layer)

Luodaan `NotebookService` (`backend/internal/services/notebook_service.go`), joka vastaa liiketoimintalogiikasta.

```go
package services

import (
 "context"
 "github.com/google/uuid"
 "github.com/mvirtai/clible-v3-go/internal/db"
 "github.com/mvirtai/clible-v3-go/internal/models"
)

type NotebookService struct {
 repo db.NotebookRepository
}

func NewNotebookService(repo db.NotebookRepository) *NotebookService {
 return &NotebookService{repo: repo}
}

func (s *NotebookService) CreateNotebook(ctx context.Context, title string, userID uuid.UUID, scopeID *uuid.UUID) (*models.Notebook, error) {
 nb := &models.Notebook{
  ID:      uuid.New(),
  Title:   title,
  UserID:  userID,
  ScopeID: scopeID,
 }
 if err := s.repo.Create(ctx, nb); err != nil {
  return nil, err
 }
 return nb, nil
}

// Lisää CRUD-palvelut...
```

---

## 5. API-rajapinta (API Endpoints)

Luodaan `NotebookHandler` (`backend/internal/api/notebook_handler.go`) ja suojataan se `RequireAuth`-middlewarella.

* `GET /api/notebooks` — Hakee kaikki käyttäjän muistiinpanot.
* `GET /api/notebooks/{id}` — Hakee yksittäisen Notebookin ja sen solut.
* `POST /api/notebooks` — Luo uuden tyhjän muistiinpanokirjan.
* `PUT /api/notebooks/{id}` — Päivittää otsikon tai työtilakytkennän.
* `PUT /api/notebooks/{id}/cells` — Tallenna solujen nykyinen tila ja järjestys (Body: `[]Cell`).
* `DELETE /api/notebooks/{id}` — Poistaa muistiinpanokirjan.
