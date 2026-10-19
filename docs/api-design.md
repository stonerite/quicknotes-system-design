# QuickNotes API Design

This document describes the real REST API the QuickNotes backend team should build. It is **not** the JSONPlaceholder practice API used by the browser client.

- Base URL: `https://api.quicknotes.example/v1`
- Format: JSON (`Content-Type: application/json`)
- Authentication: `Authorization: Bearer <access_token>` on every endpoint except register and login
- Resources are nouns, plural, lowercase. The HTTP method carries the action.

## 1. Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | POST | `/users` | Register a new user | `201 Created` |
| 2 | POST | `/sessions` | Log in and receive an access token | `200 OK` |
| 3 | GET | `/notes` | List the signed-in user's notes (supports `?page=`, `?limit=`, `?tag=`, `?q=`) | `200 OK` |
| 4 | POST | `/notes` | Create a note | `201 Created` |
| 5 | GET | `/notes/{id}` | Get one note | `200 OK` |
| 6 | PUT | `/notes/{id}` | Replace a note (title, body, tags) | `200 OK` |
| 7 | PATCH | `/notes/{id}` | Partially update a note | `200 OK` |
| 8 | DELETE | `/notes/{id}` | Delete a note | `204 No Content` |
| 9 | GET | `/tags` | List the user's tags | `200 OK` |
| 10 | PUT | `/notes/{id}/tags/{tagId}` | Attach a tag to a note (idempotent) | `204 No Content` |
| 11 | DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note | `204 No Content` |

Design notes:

- `GET` is safe and never changes data. `PUT` and `DELETE` are idempotent.
- `POST /notes` returns a `Location: /v1/notes/{id}` header.
- Lists are paginated (default `limit=20`, maximum `100`) so response size stays predictable.
- A user can only see and change their own notes. Asking for another user's note returns `404` (not `403`) so note ids cannot be probed.

## 2. Examples

### Create a note: `POST /notes`

Request:

```http
POST /v1/notes HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "title": "Buy milk",
  "body": "Two litres, full cream",
  "tags": ["shopping", "home"]
}
```

Response: `201 Created`

```http
Location: /v1/notes/4821
```

```json
{
  "id": 4821,
  "userId": 17,
  "title": "Buy milk",
  "body": "Two litres, full cream",
  "tags": ["shopping", "home"],
  "createdAt": "2026-10-16T12:44:10Z",
  "updatedAt": "2026-10-16T12:44:10Z"
}
```

Validation rules: `title` is required and at most 100 characters; `body` is optional (maximum 10,000 characters); `tags` is optional (maximum 10 tags, each up to 30 characters).

### List notes: `GET /notes?page=1&limit=2`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 4821,
      "userId": 17,
      "title": "Buy milk",
      "body": "Two litres, full cream",
      "tags": ["shopping", "home"],
      "createdAt": "2026-10-16T12:44:10Z",
      "updatedAt": "2026-10-16T12:44:10Z"
    },
    {
      "id": 4790,
      "userId": 17,
      "title": "Call the bank",
      "body": "",
      "tags": [],
      "createdAt": "2026-10-15T08:02:51Z",
      "updatedAt": "2026-10-15T08:02:51Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 57
}
```

## 3. Error responses

Every error uses the same JSON body so clients can handle them in one place.

| Status | Meaning | When it is returned |
|--------|---------|---------------------|
| `400 Bad Request` | Invalid input | Missing title, title over 100 characters, malformed JSON, bad query parameter |
| `401 Unauthorized` | Not authenticated | Missing, expired or invalid token; wrong login credentials |
| `403 Forbidden` | Authenticated but not allowed | Account suspended, or the token lacks the required scope |
| `404 Not Found` | Resource does not exist | Unknown note id, or a note owned by someone else |
| `409 Conflict` | State conflict | Registering an email that already exists |
| `429 Too Many Requests` | Rate limit hit | More than 100 requests per minute per user |
| `500 Internal Server Error` | Unexpected server fault | Bug or dependency failure (details are logged, never exposed) |

Example error body (`400 Bad Request`):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be 100 characters or fewer.",
    "details": [
      { "field": "title", "issue": "max_length_exceeded", "max": 100 }
    ],
    "requestId": "req_8f3a1c92"
  }
}
```

Example error body (`404 Not Found`):

```json
{
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "No note with id 9999 was found.",
    "requestId": "req_5d21b7e0"
  }
}
```
