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

loadBtn.addEventListener("click", handleLoad);
showEmptyState();
