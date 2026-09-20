# Clible v3 Data Flow Matrix

This reference traces key end-to-end user workflows across the frontend, API, service, DSL engine, and database layers.

---

## 1. Trace 1: ISLA v2 Execution in 2D Notebook Canvas

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant Editor as Monaco / ISLABlock.tsx
    participant API as POST /api/dsl/execute
    participant Parser as ISLA Parser (backend/new_dsl)
    participant Exec as ISLA Executor
    participant DB as Neon PostgreSQL
    participant Card as CanvasGrid.tsx (Card Render)

    User->>Editor: Enters `Joh 1:1-5.vs(kr92, kjv) >>`
    Editor->>API: Sends JSON payload { expression: "Joh 1:1-5..." }
    API->>Parser: Tokenizes & builds AST (LL(1) descent)
    Parser-->>API: Returns *ISLAExpression AST
    API->>Exec: Evaluates AST against DB context
    Exec->>DB: Executes parameterized SQL query ($1: book, $2: chapter, $3: verses)
    DB-->>Exec: Returns matching Verse records
    Exec-->>API: Aggregates results into DSLResponse { verses, outputOp: ">>" }
    API-->>Editor: HTTP 200 OK with formatted JSON
    Editor->>Card: Emits new Card into 24-col CanvasGrid below active cell
    Card-->>User: Displays side-by-side translation comparison
```

---

## 2. Trace 2: Guest Mode vs. Authenticated User Request

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest User
    actor Member as Authenticated Member
    participant Frontend as React 19 Frontend
    participant Mid as middleware.OptionalAuth
    participant Service as NotebookService
    participant DB as Neon PostgreSQL

    alt Guest Scenario
        Guest->>Frontend: Creates temporary notebook
        Frontend->>Mid: Request without Authorization Bearer header
        Mid-->>Service: Context without UserID (guest session)
        Service->>DB: Stores notebook with 1-hour TTL flag & guest identifier
        DB-->>Frontend: Returns guest notebook ID
        Frontend-->>Guest: Renders guest banner with 60-min countdown timer
    else Authenticated Scenario
        Member->>Frontend: Saves study workspace
        Frontend->>Mid: Request with `Authorization: Bearer <JWT>`
        Mid->>Mid: Validates JWT signature & expiry
        Mid-->>Service: Injects validated UserID into context via ctxkeys.WithUserID
        Service->>DB: Stores notebook permanently linked to users(id)
        DB-->>Frontend: Returns saved workspace metadata
        Frontend-->>Member: Confirms permanent cloud save
    end
```

---

## 3. Trace 3: AI Semantic Search & Curation Triage

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as AiSemanticSearch.tsx
    participant API as POST /api/search/semantic
    participant AI as Embedding / Vector Service
    participant Repo as VerseRepository
    participant Triage as CuratedVerseCard.tsx

    User->>UI: Enters query "grace and truth in gospel"
    UI->>API: Submits search text & target translations
    API->>AI: Computes query vector / similarity match
    AI-->>API: Returns top verse candidates with confidence scores
    API->>Repo: Fetches verse text by IDs (parameterized query)
    Repo-->>API: Returns verse details
    API-->>UI: Sends candidates array
    UI->>Triage: Displays swipeable cards
    User->>Triage: Swipes Right (Accept) or Clicks Bookmark
    Triage-->>UI: Adds verse to local workspace state (pure derived state)
```
