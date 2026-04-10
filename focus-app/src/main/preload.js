const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for quick-capture trigger from main process
  onOpenQuickCapture: (callback) => ipcRenderer.on('open-quick-capture', callback),

  // Send a native macOS notification
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
});
