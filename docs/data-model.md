# QuickNotes Data Model

The schema below is written for PostgreSQL and backs the endpoints in [api-design.md](api-design.md).

## 1. Entities

### users

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

### notes

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| user_id | BIGINT | NOT NULL, **Foreign key** to `users(id)` |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | NOT NULL, default `''` |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()` |

### tags

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| user_id | BIGINT | NOT NULL, **Foreign key** to `users(id)` |
| name | VARCHAR(30) | NOT NULL, UNIQUE together with `user_id` |

### note_tags (join table)

| Column | Type | Key / constraint |
|--------|------|------------------|
| note_id | BIGINT | **Primary key (part 1)**, **Foreign key** to `notes(id)` |
| tag_id | BIGINT | **Primary key (part 2)**, **Foreign key** to `tags(id)` |

## 2. Relationships

- **users to notes: one-to-many.** One user writes many notes; each note belongs to exactly one user (`notes.user_id`).
- **users to tags: one-to-many.** Each user owns their own set of tags (`tags.user_id`), so two users can both have a tag called "work" without sharing it.
- **notes to tags: many-to-many.** A note can have several tags and a tag can be on many notes. A relational table cannot store a list in one column cleanly, so the join table `note_tags` holds one row per (note, tag) pair. Its composite primary key stops the same tag being attached twice.

```
users 1 ──── * notes 1 ──── * note_tags * ──── 1 tags * ──── 1 users
```

Deleting a note removes its `note_tags` rows (`ON DELETE CASCADE`). Deleting a user removes their notes and tags the same way.

## 3. CREATE TABLE statements

```sql
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE notes (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(100) NOT NULL CHECK (length(trim(title)) > 0),
    body       TEXT         NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE tags (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    VARCHAR(30) NOT NULL,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);
```

## 4. Indexes

```sql
-- Serves GET /notes: "newest notes for this user".
CREATE INDEX idx_notes_user_created
    ON notes (user_id, created_at DESC);

-- Serves "all notes with tag X": the primary key (note_id, tag_id) only helps
-- lookups that start from the note, so we add the reverse direction.
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id, note_id);
```

**Reason for `idx_notes_user_created`:** almost every read is "list my notes, newest first". Without the index the database scans the whole `notes` table (hundreds of millions of rows after a year, see [architecture.md](architecture.md)) and sorts the result. With it, the database jumps straight to one user's rows already in order, so the query stays fast no matter how large the table grows. The cost is a little extra work on each write, which is acceptable because reads outnumber writes.

## 5. Example queries

**1. List a user's 20 newest notes (uses `idx_notes_user_created`):**

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 17
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**2. Notes with their tags (JOIN across three tables):**

```sql
SELECT n.id,
       n.title,
       COALESCE(array_agg(t.name ORDER BY t.name)
                FILTER (WHERE t.id IS NOT NULL), '{}') AS tags
FROM notes n
LEFT JOIN note_tags nt ON nt.note_id = n.id
LEFT JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 17
GROUP BY n.id
ORDER BY n.created_at DESC
LIMIT 20;
```

**3. All of a user's notes with a given tag:**

```sql
SELECT n.id, n.title
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 17
  AND t.name = 'shopping'
ORDER BY n.created_at DESC;
```

**4. How many notes each tag has:**

```sql
SELECT t.name, COUNT(*) AS note_count
FROM tags t
JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 17
GROUP BY t.name
ORDER BY note_count DESC;
```

## 6. SQL or NoSQL?

I chose **SQL (PostgreSQL)**. QuickNotes data is naturally relational: users own notes and tags, and notes and tags form a many-to-many relationship. Foreign keys, unique constraints and transactions let the database guarantee that a note always has an owner and a tag is never attached twice, instead of every service re-checking this in code. Queries like "notes with tag X" need joins, which SQL does well. Notes are small, structured records and there are no wildly varying document shapes, so a document database offers little extra here. The usual worry is scale, but one million users produces roughly 330 million note rows per year (a few billion after a decade), which a single PostgreSQL primary with read replicas, good indexes and later partitioning by `user_id` can handle. If search over note text becomes important, we can add a dedicated search engine beside PostgreSQL rather than replacing it.
