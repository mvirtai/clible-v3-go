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

### 3. Delete Workspace Scope

Deletes a scope and all its nested saved searches and analyses (`ON DELETE CASCADE`).

- **Endpoint**: `DELETE /api/scopes`
- **Query Parameters**:
  - `id` (string, required): UUID of the scope to delete.
- **Response (200 OK)**:

  ```json
  {
    "status": "deleted"
  }
  ```

### 4. Fetch Aggregate Workspace Data

Retrieves the complete workspace package, including its own metadata, saved searches, and saved analyses in a single round-trip.

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
    ]
  }
  ```

### 5. Save Search

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

- **Response (201 Created)**: (returns the populated object with generated UUID and timestamp)

### 6. Save Analysis

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

- **Response (201 Created)**: (returns the populated object with generated UUID and timestamp)

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

- **Response (201 Created)**: (returns the created history item)
