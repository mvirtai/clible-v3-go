# Web API Reference

clible-v3-go exposes a stateless REST HTTP API interface to handle all interactions between the React frontend client and the Go service backend layer. All data payloads exchange via standard JSON except for the translation file uploads which use standard multi-part streaming forms.

---

## Global API Rules

- **Base URL**: The API endpoints are prefixed with `/api` (e.g., `http://localhost:8080/api/verses`).
- **Content-Type**: All requests and responses exchange via `application/json` (except `/api/translations/import` which uses `multipart/form-data`).
- **Authentication**: Most API endpoints are protected and require a valid session JWT cookie. The cookie is automatically set upon successful login.
- **Error Responses**: When an error occurs, the server responds with an appropriate HTTP status code (4xx or 5xx) and a structured JSON body:

  ```json
  {
    "error": "Detailed explanation of the error message"
  }
  ```

---

## Authentication API (Public)

### 1. Register User

Registers a new user account.

- **Endpoint**: `POST /api/auth/register`
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```

- **Response (201 Created)**:

  ```json
  {
    "id": "8bc751d3-3b1a-4712-8df7-e62a98e82110",
    "email": "user@example.com",
    "createdAt": "2026-07-09T07:00:00Z"
  }
  ```

### 2. Login User

Authenticates a user and sets a secure, HTTP-only `token` cookie containing the JWT session.

- **Endpoint**: `POST /api/auth/login`
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "id": "8bc751d3-3b1a-4712-8df7-e62a98e82110",
    "email": "user@example.com",
    "createdAt": "2026-07-09T07:00:00Z"
  }
  ```

### 3. Logout User

Clears the authentication token cookie.

- **Endpoint**: `POST /api/auth/logout`
- **Response (200 OK)**:

  ```json
  {
    "status": "logged out"
  }
  ```

### 4. Fetch Active Session User

Returns the metadata of the currently authenticated user.

- **Endpoint**: `GET /api/auth/me`
- **Response (200 OK)**:

  ```json
  {
    "id": "8bc751d3-3b1a-4712-8df7-e62a98e82110",
    "email": "user@example.com",
    "createdAt": "2026-07-09T07:00:00Z"
  }
  ```

---

## Verses & Search API (Protected)

### 1. Resolve Verses by Reference

Looks up scriptures for a specific reference (such as a single verse, chapter, or verse range) within a target translation.

- **Endpoint**: `GET /api/verses`
- **Query Parameters**:
  - `ref` (string, required): Reference coordinates (e.g., `John 3:16`, `Genesis 1:1-3`).
  - `translation` (string, optional): Target translation ID. Fallback resolves to user's first installed translation or `"web"`.
- **Response (200 OK)**:

  ```json
  {
    "reference": "John 3:16",
    "translationId": "web",
    "translationName": "World English Bible",
    "verses": [
      {
        "id": "web:JHN:3:16",
        "translationId": "web",
        "bookId": "JHN",
        "bookName": "John",
        "chapter": 3,
        "verse": 16,
        "text": "For God so loved the world, that he gave his only Son..."
      }
    ]
  }
  ```

### 2. Search Verses

Executes a full-text search (FTS) or a regular expression search across the target translation. Optionally scoped by testament or specific book.

- **Endpoint**: `GET /api/search`
- **Query Parameters**:
  - `q` (string, required): Search query term or regex pattern.
  - `translation` (string, required): Target translation ID.
  - `regex` (boolean, optional): Set to `true` to interpret the query as a regular expression. Defaults to `false`.
  - `scope` (string, optional): Restrict search scope (`all`, `ot`, `nt`, `book`). Defaults to `all`.
  - `scopeValue` (string, optional): Corresponding book code (e.g., `ROM`) if `scope` is `book`.
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "web:ROM:3:24",
      "translationId": "web",
      "bookId": "ROM",
      "bookName": "Romans",
      "chapter": 3,
      "verse": 24,
      "text": "being justified freely by his grace through the redemption..."
    }
  ]
  ```

---

## Book Metadata API (Public)

### 1. List Canonical Books

Retrieves all 66 canonical Bible books ordered by their biblical order.

- **Endpoint**: `GET /api/books`
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "GEN",
      "name": "Genesis",
      "testament": "OT",
      "position": 1,
      "chapters": 50
    },
    {
      "id": "EXO",
      "name": "Exodus",
      "testament": "OT",
      "position": 2,
      "chapters": 40
    }
  ]
  ```

### 2. Get Single Book Details

Retrieves details for a single book.

- **Endpoint**: `GET /api/books/{id}` (e.g., `GET /api/books/JHN`)
- **Response (200 OK)**:

  ```json
  {
    "id": "JHN",
    "name": "John",
    "testament": "NT",
    "position": 43,
    "chapters": 21
  }
  ```

---

## Translations API (Protected)

### 1. List Translations Catalog

Retrieves all Bible translations registered in the global catalog, annotated with the current user's installation status.

- **Endpoint**: `GET /api/translations`
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "web",
      "name": "World English Bible",
      "language": "ENG",
      "format": "text",
      "sourceUrl": "",
      "installedAt": "2026-07-09T07:00:00Z",
      "installed": true
    }
  ]
  ```

### 2. Link/Activate Translation

Activates a catalog translation for the logged-in user, making it accessible in their workspace.

- **Endpoint**: `POST /api/translations/link`
- **Request Body**:

  ```json
  {
    "translationId": "web"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "id": "web",
    "status": "activated"
  }
  ```

### 3. Unlink/Deactivate Translation

Deactivates a catalog translation for the user, removing it from their active workspace.

- **Endpoint**: `DELETE /api/translations/link`
- **Request Body**:

  ```json
  {
    "translationId": "web"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "id": "web",
    "status": "deactivated"
  }
  ```

### 4. Upload/Import Translation (Admin)

Uploads and seeds a new translation XML file (supporting USFX or OSIS format) directly into the database.

- **Endpoint**: `POST /api/translations/import`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `translationId` (string, required): Unique identifier slug (e.g. `kjv`).
  - `name` (string, required): Human-readable title (e.g. `King James Version`).
  - `language` (string, required): Language ISO tag (e.g. `ENG`).
  - `file` (file, required): The raw XML file attachment.
- **Response (201 Created)**:

  ```json
  {
    "id": "kjv",
    "status": "successfully compiled and imported"
  }
  ```

---

## Workspaces (Scopes) API (Protected)

### 1. Create Workspace Scope

Creates a new context scope for saving research.

- **Endpoint**: `POST /api/scopes`
- **Request Body**:

  ```json
  {
    "name": "Romans Study"
  }
  ```

- **Response (201 Created)**:

  ```json
  {
    "id": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "name": "Romans Study",
    "createdAt": "2026-07-09T07:00:00Z"
  }
  ```

### 2. List Workspace Scopes

Retrieves all user-created workspace scopes.

- **Endpoint**: `GET /api/scopes`
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
      "name": "Romans Study",
      "createdAt": "2026-07-09T07:00:00Z"
    }
  ]
  ```

### 3. Rename Workspace Scope

Renames an existing workspace scope.

- **Endpoint**: `PUT /api/scopes`
- **Request Body**:

  ```json
  {
    "id": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "name": "Romans Study - Extended"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "status": "renamed"
  }
  ```

### 4. Delete Workspace Scope

Deletes a scope and all its nested saved searches, analyses, and links (`ON DELETE CASCADE`).

- **Endpoint**: `DELETE /api/scopes`
- **Query Parameters**:
  - `id` (string, required): UUID of the scope to delete.
- **Response (200 OK)**:

  ```json
  {
    "status": "deleted"
  }
  ```

### 5. Fetch Aggregate Workspace Data

Retrieves the complete workspace package, including its own metadata, saved searches, saved analyses, and notebooks in a single round-trip.

- **Endpoint**: `GET /api/scopes/workspace`
- **Query Parameters**:
  - `id` (string, required): UUID of the workspace scope.
- **Response (200 OK)**:

  ```json
  {
    "id": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "name": "Romans Study",
    "createdAt": "2026-07-09T07:00:00Z",
    "savedSearches": [
      {
        "id": "e229c1fe-5ef4-4f91-ba2c-23efd6718d78",
        "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
        "name": "Search for 'grace'",
        "queryText": "grace",
        "searchScope": "book",
        "scopeValue": "ROM",
        "translationId": "web",
        "resultJson": "[{\"...\"}]",
        "createdAt": "2026-07-09T07:05:00Z"
      }
    ],
    "savedAnalyses": [
      {
        "id": "f516a19f-cfbd-45b0-96f3-1ad9ea92df1c",
        "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
        "name": "Romans 8 Frequency Analysis",
        "reference": "Romans 8",
        "analysisType": "single_stats",
        "translationId": "web",
        "paramsJson": "{}",
        "resultJson": "{\"totalWords\":540,\"uniqueWords\":210,\"lexicalDiversity\":0.388,\"frequencies\":[]}",
        "createdAt": "2026-07-09T07:10:00Z"
      }
    ],
    "notebooks": [
      {
        "id": "nb-uuid-12345",
        "title": "Romans 5 Exegesis Notes",
        "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
        "createdAt": "2026-07-09T07:12:00Z",
        "updatedAt": "2026-07-09T07:12:00Z"
      }
    ]
  }
  ```

### 6. Save Search

Pins a specific search query to a workspace scope.

- **Endpoint**: `POST /api/scopes/saved-searches`
- **Request Body**:

  ```json
  {
    "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "name": "Grace occurrences in Romans",
    "queryText": "grace",
    "searchScope": "book",
    "scopeValue": "ROM",
    "translationId": "web",
    "resultJson": "[{\"id\":\"web:ROM:3:24\",...}]"
  }
  ```

- **Response (201 Created)**: Returns the populated search item object including UUID and timestamps.

### 7. Rename Saved Search

Renames an existing saved search.

- **Endpoint**: `PUT /api/scopes/saved-searches`
- **Request Body**:

  ```json
  {
    "id": "e229c1fe-5ef4-4f91-ba2c-23efd6718d78",
    "name": "Grace occurrences in Romans (Updated)"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "status": "renamed"
  }
  ```

### 8. Delete Saved Search

Deletes a saved search from a workspace scope.

- **Endpoint**: `DELETE /api/scopes/saved-searches`
- **Query Parameters**:
  - `id` (string, required): UUID of the saved search to delete.
- **Response (200 OK)**:

  ```json
  {
    "status": "deleted"
  }
  ```

### 9. Save Analysis

Pins textual analysis result parameters to a workspace scope.

- **Endpoint**: `POST /api/scopes/saved-analyses`
- **Request Body**:

  ```json
  {
    "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "name": "Romans 8 word counts",
    "reference": "Romans 8",
    "analysisType": "single_stats",
    "translationId": "web",
    "paramsJson": "{}",
    "resultJson": "{\"totalWords\":540,\"uniqueWords\":210,\"lexicalDiversity\":0.388,\"frequencies\":[]}"
  }
  ```

- **Response (201 Created)**: Returns the populated saved analysis object.

### 10. Rename Saved Analysis

Renames an existing saved analysis.

- **Endpoint**: `PUT /api/scopes/saved-analyses`
- **Request Body**:

  ```json
  {
    "id": "f516a19f-cfbd-45b0-96f3-1ad9ea92df1c",
    "name": "Romans 8 frequency (Updated)"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "status": "renamed"
  }
  ```

### 11. Delete Saved Analysis

Deletes a saved analysis from a workspace scope.

- **Endpoint**: `DELETE /api/scopes/saved-analyses`
- **Query Parameters**:
  - `id` (string, required): UUID of the saved analysis to delete.
- **Response (200 OK)**:

  ```json
  {
    "status": "deleted"
  }
  ```

---

## Notebooks API (Protected)

### 1. List Notebooks

Retrieves all notebooks belonging to the active user.

- **Endpoint**: `GET /api/notebooks`
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "nb-uuid-12345",
      "title": "Romans 5 Exegesis Notes",
      "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
      "createdAt": "2026-07-09T07:12:00Z",
      "updatedAt": "2026-07-09T07:12:00Z"
    }
  ]
  ```

### 2. Get Single Notebook

Retrieves details of a specific notebook along with its ordered cells.

- **Endpoint**: `GET /api/notebooks/{id}`
- **Response (200 OK)**:

  ```json
  {
    "id": "nb-uuid-12345",
    "title": "Romans 5 Exegesis Notes",
    "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110",
    "createdAt": "2026-07-09T07:12:00Z",
    "updatedAt": "2026-07-09T07:12:00Z",
    "cells": [
      {
        "id": "cell-uuid-1",
        "notebookId": "nb-uuid-12345",
        "type": "markdown",
        "content": "### Introduction to Romans 5\nFaith brings peace.",
        "position": 0,
        "resultJson": null,
        "createdAt": "2026-07-09T07:12:30Z",
        "updatedAt": "2026-07-09T07:12:30Z"
      },
      {
        "id": "cell-uuid-2",
        "notebookId": "nb-uuid-12345",
        "type": "code",
        "content": "/compare ROM 5:1 web kjv",
        "position": 1,
        "resultJson": {
          "type": "verse_comparison",
          "data": {
            "reference": "ROM 5:1",
            "translation1Text": "Being therefore justified by faith...",
            "translation2Text": "Therefore being justified by faith..."
          }
        },
        "createdAt": "2026-07-09T07:13:00Z",
        "updatedAt": "2026-07-09T07:13:00Z"
      }
    ]
  }
  ```

### 3. Create Notebook

Initializes a new notebook.

- **Endpoint**: `POST /api/notebooks`
- **Request Body**:

  ```json
  {
    "title": "Romans 5 Exegesis Notes",
    "scopeId": "7bc751d3-3b1a-4712-8df7-e62a98e82110"
  }
  ```

- **Response (201 Created)**: Returns the newly created notebook object with empty cells.

### 4. Update Notebook Metadata

Updates a notebook's title and workspace scope association.

- **Endpoint**: `PUT /api/notebooks/{id}`
- **Request Body**:

  ```json
  {
    "title": "Romans 5 Study Sheet (Final)",
    "scopeId": ""
  }
  ```

- **Response (200 OK)**: Returns the updated notebook object.

### 5. Save Notebook Cells

Replaces the entire cells array for a notebook, updating content and layout positioning in a single transaction.

- **Endpoint**: `PUT /api/notebooks/{id}/cells`
- **Request Body**:

  ```json
  [
    {
      "id": "cell-uuid-1",
      "notebookId": "nb-uuid-12345",
      "type": "markdown",
      "content": "### Introduction to Romans 5 (Revised)",
      "position": 0,
      "resultJson": null
    }
  ]
  ```

- **Response (200 OK)**:

  ```json
  {
    "status": "saved"
  }
  ```

### 6. Delete Notebook

Deletes a notebook along with all its nested cells.

- **Endpoint**: `DELETE /api/notebooks/{id}`
- **Response (200 OK)**:

  ```json
  {
    "status": "deleted"
  }
  ```

---

## Analytics API (Protected)

### 1. Analyze Scripture Reference

Computes lexical density, word counts, and token frequencies for a given verse range or book.

- **Endpoint**: `POST /api/analytics/analyze`
- **Request Body**:

  ```json
  {
    "reference": "John 3",
    "translationId": "web"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "reference": "John 3",
    "totalWords": 789,
    "uniqueWords": 210,
    "lexicalDiversity": 0.266,
    "frequencies": [
      { "word": "world", "count": 12 },
      { "word": "life", "count": 10 }
    ]
  }
  ```

### 2. Compare Translations

Computes comparative word differences and text similarities between two translations for a given reference.

- **Endpoint**: `POST /api/analytics/compare`
- **Request Body**:

  ```json
  {
    "reference": "John 3:16",
    "translationId1": "web",
    "translationId2": "kjv"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "reference": "John 3:16",
    "similarity": 0.85,
    "translation1Text": "For God so loved the world...",
    "translation2Text": "For God so loved the world...",
    "differences": [
      { "type": "modified", "t1": "that he gave", "t2": "that he gave his only" }
    ]
  }
  ```

---

## Search History API (Protected)

### 1. Fetch Search History

Retrieves the most recent search history records.

- **Endpoint**: `GET /api/history`
- **Response (200 OK)**:

  ```json
  [
    {
      "id": "history-uuid",
      "queryText": "grace",
      "searchScope": "bible",
      "scopeValue": "",
      "translationId": "web",
      "mode": "phrase",
      "resultCount": 120,
      "searchedAt": "2026-07-09T07:15:00Z"
    }
  ]
  ```

### 2. Record Search History

Appends a new search execution footprint to the history table.

- **Endpoint**: `POST /api/history`
- **Request Body**:

  ```json
  {
    "queryText": "grace",
    "searchScope": "bible",
    "scopeValue": "",
    "translationId": "web",
    "mode": "phrase",
    "resultCount": 120
  }
  ```

- **Response (201 Created)**: Returns the created history item.

---

## Gemini AI API (Protected & Rate Limited)

> [!IMPORTANT]
> All Gemini AI endpoints are bound by strict IP-based rate limiting (maximum 15 requests per hour, with a burst buffer capacity of 5). 
> If rate limits are exceeded, the API responds with `429 Too Many Requests`.
>
> If the `GEMINI_API_KEY` is not set on the server environment, AI routes respond with `503 Service Unavailable`:
> ```json
> {
>   "error": "AI disabled",
>   "hint": "Set GEMINI_API_KEY to enable AI features."
> }
> ```

### 1. Generate Verse Insight

Generates theological insights or commentaries focusing on particular hermeneutic rules.

- **Endpoint**: `POST /api/ai/insight`
- **Request Body**:

  ```json
  {
    "text": "For God so loved the world...",
    "focus": "covenant"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "insight": "The covenantal aspect of God's love in John 3:16..."
  }
  ```

### 2. Analyze Literary Tone

Analyzes literary characteristics, structural outlines, and tonalities of a scripture segment.

- **Endpoint**: `POST /api/ai/tone`
- **Request Body**:

  ```json
  {
    "text": "For God so loved the world...",
    "focus": "urgency"
  }
  ```

- **Response (200 OK)**: Returns structural outline and literary tone analysis.

### 3. Topic Deep-Dive Study

Generates a comprehensive exegesis study on a theological topic with optional custom constraints.

- **Endpoint**: `POST /api/ai/deep-dive`
- **Request Body**:

  ```json
  {
    "topic": "Justification by faith in Pauline epistles",
    "outputLanguage": "en",
    "context": {}
  }
  ```

- **Response (200 OK)**: Detailed theological deep-dive text.

### 4. Original Language Study

Conducts detailed Greek or Hebrew root word studies from a source text reference.

- **Endpoint**: `POST /api/ai/original-study`
- **Request Body**:

  ```json
  {
    "reference": "John 3:16",
    "sourceText": "Οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον...",
    "sourceLanguage": "grc",
    "translations": [
      {
        "name": "web",
        "text": "For God so loved the world..."
      }
    ],
    "scope": "agape study",
    "focus": "verb roots"
  }
  ```

- **Response (200 OK)**: Lexicon morphology breakdown and usage insight.

### 5. Semantic AI Search

Searches scriptures using natural language queries (concepts, themes) instead of keyword matching.

- **Endpoint**: `POST /api/ai/search`
- **Request Body**:

  ```json
  {
    "query": "Where does it talk about the armor of God?",
    "translationId": "web",
    "uiLanguage": "en"
  }
  ```

- **Response (200 OK)**: Returns semantically matching verse references and explanations.

### 6. AI Translation Comparison

Compares linguistic and theological differences between two translations for a reference.

- **Endpoint**: `POST /api/ai/compare`
- **Request Body**:

  ```json
  {
    "reference": "John 3:16",
    "translationA": "web",
    "textA": "For God so loved the world...",
    "translationB": "kjv",
    "textB": "For God so loved the world...",
    "focus": "emphasis on agape vs love"
  }
  ```

- **Response (200 OK)**: Returns detailed translation differences and structural emphasis comparisons.

