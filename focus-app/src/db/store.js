const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_PATH = path.join(app.getPath('userData'), 'holocron-data.json');

const DEFAULT_DATA = {
  tasks: [],
  notes: [],
  focusSessions: [],
  dailyPlans: [],
};

function read() {
  try {
    if (!fs.existsSync(DATA_PATH)) return structuredClone(DEFAULT_DATA);
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function write(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

function getTasks() {
  const data = read();
  // Ensure all tasks have an order field
  let dirty = false;
  data.tasks.forEach((t, i) => {
    if (t.order === undefined) { t.order = i; dirty = true; }
  });
  if (dirty) write(data);
  return data.tasks.sort((a, b) => a.order - b.order);
}

function addTask({ title, priority = 'med', dueDate = null }) {
  const data = read();
  const maxOrder = data.tasks.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
  const task = {
    id: uid(),
    title,
    priority,
    dueDate,
    done: false,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    completedAt: null,
    carriedOverCount: 0,
  };
  data.tasks.push(task);
  write(data);
  return task;
}

function updateTask(id, changes) {
  const data = read();
  const idx = data.tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  data.tasks[idx] = { ...data.tasks[idx], ...changes };
  if (changes.done === true && !data.tasks[idx].completedAt) {
    data.tasks[idx].completedAt = new Date().toISOString();
  }
  if (changes.done === false) {
    data.tasks[idx].completedAt = null;
  }
  write(data);
  return data.tasks[idx];
}

function deleteTask(id) {
  const data = read();
  data.tasks = data.tasks.filter(t => t.id !== id);
  write(data);
}

function reorderTasks(orderedIds) {
  const data = read();
  orderedIds.forEach((id, i) => {
    const task = data.tasks.find(t => t.id === id);
    if (task) task.order = i;
  });
  write(data);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

function getNotes() {
  return read().notes;
}

function addNote({ content, taskId = null }) {
  const data = read();
  const note = {
    id: uid(),
    content,
    taskId,
    summary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.notes.unshift(note);
  write(data);
  return note;
}

function updateNote(id, changes) {
  const data = read();
  const idx = data.notes.findIndex(n => n.id === id);
  if (idx === -1) return null;
  data.notes[idx] = { ...data.notes[idx], ...changes, updatedAt: new Date().toISOString() };
  write(data);
  return data.notes[idx];
}

function deleteNote(id) {
  const data = read();
  data.notes = data.notes.filter(n => n.id !== id);
  write(data);
}

// ── Focus Sessions ─────────────────────────────────────────────────────────────

function getFocusSessions(date) {
  // date: 'YYYY-MM-DD' — returns sessions for that day
  const data = read();
  return data.focusSessions.filter(s => s.date === date);
}

function addFocusSession({ taskId, taskTitle, durationMinutes, reflection, interrupted }) {
  const data = read();
  const now = new Date();
  const session = {
    id: uid(),
    taskId,
    taskTitle,
    durationMinutes,
    reflection: reflection || '',
    interrupted: interrupted || false,
    date: now.toISOString().slice(0, 10),
    completedAt: now.toISOString(),
  };
  data.focusSessions.push(session);
  write(data);
  return session;
}

module.exports = { getTasks, addTask, updateTask, deleteTask, reorderTasks, getNotes, addNote, updateNote, deleteNote, getFocusSessions, addFocusSession };
