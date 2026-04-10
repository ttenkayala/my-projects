const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for quick-capture trigger from main process
  onOpenQuickCapture: (callback) => ipcRenderer.on('open-quick-capture', callback),

  // Native macOS notification
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),

  // Task CRUD
  getTasks:     ()              => ipcRenderer.invoke('tasks:get'),
  addTask:      (task)         => ipcRenderer.invoke('tasks:add', task),
  updateTask:   (id, changes)  => ipcRenderer.invoke('tasks:update', id, changes),
  deleteTask:   (id)           => ipcRenderer.invoke('tasks:delete', id),
  reorderTasks: (ids)          => ipcRenderer.invoke('tasks:reorder', ids),

  // Focus sessions
  getSessions: (date)         => ipcRenderer.invoke('sessions:get', date),
  addSession:  (session)      => ipcRenderer.invoke('sessions:add', session),

  // Notes
  getNotes:    ()              => ipcRenderer.invoke('notes:get'),
  addNote:     (note)          => ipcRenderer.invoke('notes:add', note),
  updateNote:  (id, changes)   => ipcRenderer.invoke('notes:update', id, changes),
  deleteNote:  (id)            => ipcRenderer.invoke('notes:delete', id),

  // Claude
  claudeKickoff:   (tasks)   => ipcRenderer.invoke('claude:kickoff', tasks),
  claudeReview:    (payload) => ipcRenderer.invoke('claude:review', payload),
  claudeDrift:     (payload) => ipcRenderer.invoke('claude:drift', payload),
  claudeDraft:     (payload) => ipcRenderer.invoke('claude:draft', payload),
  claudeSummarize: (content)          => ipcRenderer.invoke('claude:summarize', content),
  claudeFollowup:  (prompt, history)  => ipcRenderer.invoke('claude:followup', { prompt, history }),
});
