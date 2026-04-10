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

module.exports = { getTasks, addTask, updateTask, deleteTask, getFocusSessions, addFocusSession };
