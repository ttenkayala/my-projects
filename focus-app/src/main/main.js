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

  tray.setToolTip('Focus App');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
}

function openQuickCapture() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.webContents.send('open-quick-capture');
  }
}

app.whenReady().then(() => {
  // Tray icon: create a placeholder if asset missing
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
ipcMain.handle('sessions:add', (_, session) => store.addFocusSession(session));

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
