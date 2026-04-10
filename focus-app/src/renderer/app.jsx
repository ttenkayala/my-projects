const { useState, useEffect, useCallback } = React;

// ── Sample data (replaced by SQLite in Phase 2) ──────────────────────────────
const SAMPLE_TASKS = [
  { id: 1, title: 'Morning kickoff — plan today\'s top 3', priority: 'high', done: false },
  { id: 2, title: 'Review focus-app Phase 2 plan', priority: 'high', done: false },
  { id: 3, title: 'Draft Slack update for data team', priority: 'med', done: false },
  { id: 4, title: 'Log yesterday\'s focus session notes', priority: 'low', done: true },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function PriorityBadge({ level }) {
  const cls = level === 'high' ? 'priority-high' : level === 'med' ? 'priority-med' : 'priority-low';
  return <span className={`priority-badge ${cls}`}>{level}</span>;
}

function TaskItem({ task, onToggle }) {
  return (
    <div className={`task-item ${task.done ? 'done' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        title={task.done ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </button>
      <span className="task-title">{task.title}</span>
      <PriorityBadge level={task.priority} />
    </div>
  );
}

function TodayView() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [newTask, setNewTask] = useState('');

  const toggleTask = (id) =>
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), title: newTask.trim(), priority: 'med', done: false }]);
    setNewTask('');
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  return (
    <div>
      <div className="section-title">Today — {pending.length} remaining</div>
      <div className="task-list">
        {pending.map(t => <TaskItem key={t.id} task={t} onToggle={toggleTask} />)}
      </div>

      <div className="add-task-row">
        <input
          className="input"
          placeholder="Add a task... (Enter to save)"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button className="btn btn-primary" onClick={addTask}>Add</button>
      </div>

      {done.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 28 }}>Completed</div>
          <div className="task-list">
            {done.map(t => <TaskItem key={t.id} task={t} onToggle={toggleTask} />)}
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

  const handleSubmit = () => {
    if (!value.trim()) { onClose(); return; }
    // Phase 2: save to SQLite
    console.log('Quick capture:', value.trim());
    setValue('');
    onClose();
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
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Task or note... (Enter to save, Esc to cancel)"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

const TABS = ['Today', 'Focus', 'Notes', 'Coach'];

function App() {
  const [activeTab, setActiveTab] = useState('Today');
  const [showCapture, setShowCapture] = useState(false);

  // Listen for quick-capture trigger from Electron main process
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onOpenQuickCapture(() => setShowCapture(true));
    }
    // Also support Cmd+Shift+F from within the renderer (fallback)
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
