const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, Notification } = require('electron');
const path = require('path');
const store = require('../db/store');
const claude = require('../claude/client');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, '../../assets/app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a simple template icon — replace with your own 16x16 png later
  tray = new Tray(path.join(__dirname, '../../assets/tray-icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Focus App', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Quick Capture', accelerator: 'CmdOrCtrl+Shift+F', click: () => openQuickCapture() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('Holocron');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
}

function openQuickCapture() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.webContents.send('open-quick-capture');
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

let lastActivityTime = Date.now();
const IDLE_THRESHOLD_MS = 45 * 60 * 1000; // 45 min
const EOD_HOUR = 17; // 5pm

function startNotificationTimers() {
  // Idle nudge — check every 5 min
  setInterval(() => {
    const idleMs = Date.now() - lastActivityTime;
    if (idleMs >= IDLE_THRESHOLD_MS) {
      new Notification({
        title: 'Holocron nudge',
        body: "You haven't logged a focus session in 45 minutes. Still on track?",
      }).show();
      lastActivityTime = Date.now(); // reset so it doesn't spam
    }
  }, 5 * 60 * 1000);

  // End-of-day reminder — check every minute
  let eodFiredToday = null;
  setInterval(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() === EOD_HOUR && now.getMinutes() === 0 && eodFiredToday !== today) {
      eodFiredToday = today;
      new Notification({
        title: 'End of day — Holocron',
        body: 'Time to review your day. Open the Coach tab.',
      }).show();
    }
  }, 60 * 1000);
}

// Set dock icon as early as possible on macOS
const { nativeImage } = require('electron');
app.on('ready', () => {
  const assetsDir = path.join(__dirname, '../../assets');
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(assetsDir, 'app-icon.png'));
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }
});

app.whenReady().then(() => {
  const assetsDir = path.join(__dirname, '../../assets');
  const fs = require('fs');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  createWindow();

  const iconPath = path.join(assetsDir, 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    createTray();
  } else {
    console.warn('Tray icon not found — skipping tray. Add assets/tray-icon.png to enable it.');
  }

  // Global shortcut: Cmd+Shift+F → quick capture
  globalShortcut.register('CmdOrCtrl+Shift+F', openQuickCapture);

  startNotificationTimers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep app alive in tray on macOS
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC: notifications
ipcMain.on('notify', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// IPC: task CRUD
ipcMain.handle('tasks:get',    () => store.getTasks());
ipcMain.handle('tasks:add',    (_, task) => store.addTask(task));
ipcMain.handle('tasks:update', (_, id, changes) => store.updateTask(id, changes));
ipcMain.handle('tasks:delete', (_, id) => store.deleteTask(id));

// IPC: notes
ipcMain.handle('notes:get',    () => store.getNotes());
ipcMain.handle('notes:add',    (_, note) => store.addNote(note));
ipcMain.handle('notes:update', (_, id, changes) => store.updateNote(id, changes));
ipcMain.handle('notes:delete', (_, id) => store.deleteNote(id));

// IPC: focus sessions
ipcMain.handle('sessions:get', (_, date) => store.getFocusSessions(date));
ipcMain.handle('sessions:add', (_, session) => {
  lastActivityTime = Date.now(); // reset idle timer
  return store.addFocusSession(session);
});

// IPC: Claude
ipcMain.handle('claude:kickoff', async (_, tasks) => {
  try {
    return await claude.ask(claude.kickoffPrompt(tasks));
  } catch (e) {
    console.error('Claude error:', e.message, e.status, e.error);
    throw e;
  }
});
ipcMain.handle('claude:review', async (_, payload) => {
  return claude.ask(claude.reviewPrompt(payload), { model: 'claude-sonnet-4-6' });
});
ipcMain.handle('claude:drift', async (_, payload) => {
  return claude.ask(claude.driftPrompt(payload));
});
ipcMain.handle('claude:draft', async (_, payload) => {
  return claude.ask(claude.draftPrompt(payload), { model: 'claude-sonnet-4-6' });
});
ipcMain.handle('claude:summarize', async (_, content) => {
  return claude.ask(claude.summarizePrompt(content));
});
