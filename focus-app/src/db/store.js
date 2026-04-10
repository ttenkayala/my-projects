const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_PATH = path.join(app.getPath('userData'), 'focus-data.json');

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
  return read().tasks;
}

function addTask({ title, priority = 'med' }) {
  const data = read();
  const task = {
    id: uid(),
    title,
    priority,
    done: false,
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

module.exports = { getTasks, addTask, updateTask, deleteTask };
