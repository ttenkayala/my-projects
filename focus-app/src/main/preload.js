const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for quick-capture trigger from main process
  onOpenQuickCapture: (callback) => ipcRenderer.on('open-quick-capture', callback),

  // Native macOS notification
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),

  // Task CRUD
  getTasks:    ()              => ipcRenderer.invoke('tasks:get'),
  addTask:     (task)         => ipcRenderer.invoke('tasks:add', task),
  updateTask:  (id, changes)  => ipcRenderer.invoke('tasks:update', id, changes),
  deleteTask:  (id)           => ipcRenderer.invoke('tasks:delete', id),

  // Focus sessions
  getSessions: (date)         => ipcRenderer.invoke('sessions:get', date),
  addSession:  (session)      => ipcRenderer.invoke('sessions:add', session),
});
