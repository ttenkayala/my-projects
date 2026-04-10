const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, Notification } = require('electron');
const path = require('path');

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

  const iconPath = path.join(assetsDir, 'tray-icon.png');
  if (!fs.existsSync(iconPath)) {
    // Write a minimal 1x1 transparent PNG as placeholder
    const { nativeImage } = require('electron');
    const img = nativeImage.createEmpty();
    fs.writeFileSync(iconPath, img.toPNG());
  }

  createWindow();
  createTray();

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

// IPC: renderer asks for notification
ipcMain.on('notify', (event, { title, body }) => {
  new Notification({ title, body }).show();
});
