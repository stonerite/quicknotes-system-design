# QuickNotes

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts:

1. **An API client** (plain HTML, CSS and JavaScript) that proves the front end can load, create and delete notes through a REST API. It uses the free [JSONPlaceholder](https://jsonplaceholder.typicode.com) practice API.
2. **Design documents** the backend team will build the real QuickNotes service from.

## How to run the API client

No build step or install is needed.

1. Clone or download this repository.
2. Open `index.html` in a browser (double-click it), or serve the folder:
   ```bash
   python3 -m http.server 8000
   ```
   then visit <http://localhost:8000>.
3. Click **Load notes** to fetch 10 notes (GET).
4. Fill in the form and click **Add note** to create one (POST). A title is required (max 100 characters); the body is optional.
5. Click **Delete** on any note to remove it (DELETE).

An internet connection is required because the client calls `https://jsonplaceholder.typicode.com/posts`. Note that JSONPlaceholder does not really save changes, so a reload shows the original data; see the comment above `deleteNote` in `api.js` for how this is handled.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `api.js` | `request()` helper, GET / POST / DELETE, validation and page states |
| `style.css` | Styling, including success and error messages |

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and the SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows and trade-offs

## What I learned

- **One reusable `request()` function keeps error handling consistent.** `fetch` only rejects on network failure, not on a 404 or 500, so I check `response.ok` and throw an error myself. Wrapping each call in `try / catch / finally` let me show friendly messages and always re-enable the buttons.
- **A good interface shows every state.** Loading, success, error and empty states stop users guessing what is happening, and disabling buttons during a request prevents duplicate submissions.
- **User text must never be inserted as HTML.** Using `textContent` instead of `innerHTML` prevents cross-site scripting, and validation (required title, 100-character limit) should happen before sending anything to the server.
- **Practice APIs behave differently from real ones.** JSONPlaceholder returns the same id (101) for every created note and never stores it, so I had to design the delete logic carefully and document the reasoning.
- **Design before you build.** Estimating load showed the traffic is modest (a few hundred requests per second at peak), so the real concerns for 1 million users are availability, caching for read-heavy traffic and avoiding single points of failure.
