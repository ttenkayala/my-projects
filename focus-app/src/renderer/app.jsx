const { useState, useEffect, useCallback } = React;

// ── Sub-components ────────────────────────────────────────────────────────────

const PRIORITY_CYCLE = { high: 'med', med: 'low', low: 'high' };

function PriorityBadge({ level, onClick }) {
  const cls = level === 'high' ? 'priority-high' : level === 'med' ? 'priority-med' : 'priority-low';
  return (
    <button
      className={`priority-badge ${cls}`}
      onClick={onClick}
      title="Click to change priority"
    >
      {level}
    </button>
  );
}

function TaskItem({ task, onToggle, onDelete, onPriority }) {
  return (
    <div className={`task-item ${task.done ? 'done' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id, !task.done)}
        title={task.done ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </button>
      <span className="task-title">{task.title}</span>
      <PriorityBadge
        level={task.priority}
        onClick={() => onPriority(task.id, PRIORITY_CYCLE[task.priority])}
      />
      <button className="task-delete" onClick={() => onDelete(task.id)} title="Delete task">×</button>
    </div>
  );
}

function TodayView() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('med');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.getTasks().then(t => {
      setTasks(t);
      setLoading(false);
    });
  }, []);

  const toggleTask = async (id, done) => {
    const updated = await window.electronAPI.updateTask(id, { done });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const deleteTask = async (id) => {
    await window.electronAPI.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const changePriority = async (id, priority) => {
    const updated = await window.electronAPI.updateTask(id, { priority });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const task = await window.electronAPI.addTask({ title: newTask.trim(), priority });
    setTasks(prev => [...prev, task]);
    setNewTask('');
    setPriority('med');
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  if (loading) return <div className="placeholder"><div className="label">Loading...</div></div>;

  return (
    <div>
      <div className="section-title">Today — {pending.length} remaining</div>

      {pending.length === 0 && (
        <div className="empty-state">All done! Add a task below or enjoy the moment.</div>
      )}

      <div className="task-list">
        {pending.map(t => <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onPriority={changePriority} />)}
      </div>

      <div className="add-task-row">
        <input
          className="input"
          placeholder="Add a task..."
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <select
          className="select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option value="high">High</option>
          <option value="med">Med</option>
          <option value="low">Low</option>
        </select>
        <button className="btn btn-primary" onClick={addTask}>Add</button>
      </div>

      {done.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 28 }}>Completed — {done.length}</div>
          <div className="task-list">
            {done.map(t => <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onPriority={changePriority} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Placeholder({ label, phase }) {
  return (
    <div className="placeholder">
      <div className="label">{label}</div>
      <div className="phase">Coming in {phase}</div>
    </div>
  );
}

// ── Quick Capture Overlay ─────────────────────────────────────────────────────

function QuickCapture({ onClose }) {
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState('med');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) { onClose(); return; }
    await window.electronAPI.addTask({ title: value.trim(), priority });
    setSaved(true);
    setTimeout(onClose, 600);
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quick-capture-box">
        <h3>Quick Capture — Cmd+Shift+F</h3>
        {saved
          ? <div style={{ color: 'var(--green)', padding: '8px 0' }}>Saved!</div>
          : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Task... (Enter to save, Esc to cancel)"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
              <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>
              <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

const TABS = ['Today', 'Focus', 'Notes', 'Coach'];

function App() {
  const [activeTab, setActiveTab] = useState('Today');
  const [showCapture, setShowCapture] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onOpenQuickCapture(() => setShowCapture(true));
    }
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowCapture(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeCapture = useCallback(() => setShowCapture(false), []);

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-title">Focus</span>
      </div>

      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="content">
        {activeTab === 'Today' && <TodayView />}
        {activeTab === 'Focus' && <Placeholder label="Pomodoro timer + drift detection" phase="Phase 4" />}
        {activeTab === 'Notes' && <Placeholder label="Notes with Claude summarization" phase="Phase 8" />}
        {activeTab === 'Coach' && <Placeholder label="Claude coaching, kickoff & review" phase="Phase 6" />}
      </div>

      {showCapture && <QuickCapture onClose={closeCapture} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
