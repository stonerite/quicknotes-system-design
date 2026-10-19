"use strict";

// Practice API. It accepts requests and returns realistic responses,
// but it does NOT store anything we send.
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");

/* ---------- UI helpers (user text always goes in via textContent) ---------- */

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes to show yet. Click \"Load notes\" or add one.";
  notesList.appendChild(li);
}

function removeEmptyState() {
  const empty = notesList.querySelector("li.empty");
  if (empty) empty.remove();
}

function createNoteItem(note) {
  const li = document.createElement("li");

  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;
  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body || "";
  content.append(title, body);

  li.append(content);
  return li;
}

function renderNotes(notes) {
  notesList.replaceChildren();
  if (notes.length === 0) {
    showEmptyState();
    return;
  }
  notes.forEach((note) => notesList.append(createNoteItem(note)));
}

/* ---------- Reusable request helper ---------- */

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  // DELETE may return an empty body, so parse defensively.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data };
}

/* ---------- GET: load 10 notes ---------- */

async function getNotes() {
  const { data } = await request(`${API_URL}?_limit=10`);
  return data;
}

async function handleLoad() {
  loadBtn.disabled = true;
  setStatus("Loading notes...", "loading");
  try {
    const notes = await getNotes();
    renderNotes(notes);
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not load your notes. Please check your connection and try again.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}

/* ---------- POST: create a note ---------- */

const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

const MAX_TITLE_LENGTH = 100;

// Returns an error message, or "" when the title is valid. Body is optional.
function validateTitle(title) {
  if (title.length === 0) return "Please enter a title for your note.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `The title is too long (${title.length}/${MAX_TITLE_LENGTH} characters).`;
  }
  return "";
}

async function createNote(note) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(note),
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  submitBtn.disabled = true;
  setStatus("Saving note...", "loading");
  try {
    const { status, data } = await createNote({ title, body, userId: 1 });
    removeEmptyState();
    notesList.prepend(createNoteItem(data));
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    noteForm.reset();
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not save your note. Your text is still in the form, so please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", handleLoad);
noteForm.addEventListener("submit", handleSubmit);
showEmptyState();
