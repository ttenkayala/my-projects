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

// ── Focus / Pomodoro ──────────────────────────────────────────────────────────

const WORK_MINS = 25;
const BREAK_MINS = 5;

function fmt(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function CheckInModal({ taskTitle, onDone }) {
  const [reflection, setReflection] = useState('');
  const [interrupted, setInterrupted] = useState(false);

  return (
    <div className="overlay" style={{ paddingTop: 100 }}>
      <div className="quick-capture-box" style={{ width: 520 }}>
        <h3 style={{ marginBottom: 14, color: 'var(--text)', fontSize: 15 }}>
          Pomodoro complete!
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          You were working on: <strong style={{ color: 'var(--text)' }}>{taskTitle}</strong>
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={interrupted}
            onChange={e => setInterrupted(e.target.checked)}
          />
          <span style={{ color: 'var(--text-muted)' }}>I got distracted / didn't stay on task</span>
        </label>
        <textarea
          className="input"
          style={{ width: '100%', height: 72, resize: 'none', marginBottom: 12 }}
          placeholder="Optional: what did you actually work on? Any blockers?"
          value={reflection}
          onChange={e => setReflection(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => onDone({ reflection, interrupted })}>
            Save & Start Break
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusView() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | work | break
  const [seconds, setSeconds] = useState(WORK_MINS * 60);
  const [pomosToday, setPomosToday] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const intervalRef = React.useRef(null);

  const today = todayStr();

  useEffect(() => {
    Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getSessions(today),
    ]).then(([t, s]) => {
      setTasks(t.filter(t => !t.done));
      setSessions(s);
      setPomosToday(s.length);
    });
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedId);

  const clearTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startWork = () => {
    if (!selectedId) return;
    setPhase('work');
    setSeconds(WORK_MINS * 60);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setShowCheckIn(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startBreak = () => {
    setPhase('break');
    setSeconds(BREAK_MINS * 60);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setPhase('idle');
          setSeconds(WORK_MINS * 60);
          window.electronAPI.notify('Break over!', 'Ready for your next pomodoro?');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    if (intervalRef.current) {
      clearTimer();
      setPhase('paused');
    } else {
      setPhase('work');
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setShowCheckIn(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stop = () => {
    clearTimer();
    setPhase('idle');
    setSeconds(WORK_MINS * 60);
  };

  const handleCheckIn = async ({ reflection, interrupted }) => {
    setShowCheckIn(false);
    const session = await window.electronAPI.addSession({
      taskId: selectedId,
      taskTitle: selectedTask?.title || '',
      durationMinutes: WORK_MINS,
      reflection,
      interrupted,
    });
    setSessions(prev => [session, ...prev]);
    setPomosToday(prev => prev + 1);
    window.electronAPI.notify('Pomodoro logged!', `${pomosToday + 1} today. Take a ${BREAK_MINS}-min break.`);
    startBreak();
  };

  useEffect(() => () => clearTimer(), []);

  const isRunning = phase === 'work' || phase === 'break';
  const canStart = !!selectedId && phase === 'idle';

  return (
    <div>
      <div className="section-title">Focus — {pomosToday} pomodoro{pomosToday !== 1 ? 's' : ''} today</div>

      {/* Task selector */}
      <div style={{ marginBottom: 24 }}>
        <select
          className="select"
          style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={isRunning || phase === 'paused'}
        >
          <option value="">— Select a task to focus on —</option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        {tasks.length === 0 && (
          <div className="empty-state" style={{ marginTop: 8 }}>No pending tasks. Add some in Today first.</div>
        )}
      </div>

      {/* Timer */}
      <div className="timer-block">
        <div className={`timer-phase-label ${phase === 'break' ? 'break' : ''}`}>
          {phase === 'idle' ? 'Ready' : phase === 'work' ? 'Focus' : phase === 'paused' ? 'Paused' : 'Break'}
        </div>
        <div className="timer-display">{fmt(seconds)}</div>
        {selectedTask && phase !== 'idle' && (
          <div className="timer-task-label">{selectedTask.title}</div>
        )}
        <div className="timer-controls">
          {canStart && (
            <button className="btn btn-primary btn-lg" onClick={startWork}>Start</button>
          )}
          {(phase === 'work' || phase === 'paused') && (
            <>
              <button className="btn btn-ghost btn-lg" onClick={pause}>
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button className="btn btn-ghost btn-lg" onClick={stop}>Stop</button>
            </>
          )}
          {phase === 'break' && (
            <button className="btn btn-ghost btn-lg" onClick={stop}>Skip Break</button>
          )}
        </div>
      </div>

      {/* Session log */}
      {sessions.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 32 }}>Today's sessions</div>
          <div className="session-list">
            {sessions.map(s => (
              <div key={s.id} className="session-item">
                <div className="session-meta">
                  <span className="session-task">{s.taskTitle}</span>
                  <span className={`session-badge ${s.interrupted ? 'interrupted' : 'clean'}`}>
                    {s.interrupted ? 'distracted' : 'focused'}
                  </span>
                </div>
                {s.reflection && <div className="session-reflection">{s.reflection}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {showCheckIn && (
        <CheckInModal taskTitle={selectedTask?.title || ''} onDone={handleCheckIn} />
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
        {activeTab === 'Focus' && <FocusView />}
        {activeTab === 'Notes' && <Placeholder label="Notes with Claude summarization" phase="Phase 8" />}
        {activeTab === 'Coach' && <Placeholder label="Claude coaching, kickoff & review" phase="Phase 6" />}
      </div>

      {showCapture && <QuickCapture onClose={closeCapture} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
