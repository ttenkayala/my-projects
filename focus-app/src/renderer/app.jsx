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

      {/* Drift detection — Quick Ask */}
      {(phase === 'work' || phase === 'paused') && selectedTask && (
        <DriftAsk currentTask={selectedTask.title} />
      )}

      {showCheckIn && (
        <CheckInModal taskTitle={selectedTask?.title || ''} onDone={handleCheckIn} />
      )}
    </div>
  );
}

function DriftAsk({ currentTask }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const text = await window.electronAPI.claudeDrift({ currentTask, question: question.trim() });
      const isDrifting = text.toUpperCase().startsWith('DRIFTING');
      setResult({ text, isDrifting });
    } catch (e) {
      setResult({ text: `Error: ${e.message}`, isDrifting: false });
    }
    setLoading(false);
  };

  return (
    <div className="drift-box">
      <div className="section-title" style={{ marginBottom: 8 }}>Quick Ask — drift check enabled</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder="Ask anything — I'll tell you if it's on task..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
        />
        <button className="btn btn-ghost" onClick={ask} disabled={loading || !question.trim()}>
          {loading ? '...' : 'Ask'}
        </button>
      </div>
      {result && (
        <div className={`drift-result ${result.isDrifting ? 'drifting' : 'on-track'}`}>
          {result.text}
        </div>
      )}
    </div>
  );
}

// ── Coach Tab ─────────────────────────────────────────────────────────────────

function MarkdownText({ text }) {
  // Minimal markdown: bold, bullets, numbered lists
  const lines = text.split('\n');
  return (
    <div className="coach-response">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // Bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p
        );
        if (/^#{1,3} /.test(line)) {
          return <div key={i} className="coach-heading">{line.replace(/^#+\s/, '')}</div>;
        }
        if (/^[\-\*] /.test(line)) {
          return <div key={i} className="coach-bullet">• {parts.slice(1)}</div>;
        }
        if (/^\d+\. /.test(line)) {
          return <div key={i} className="coach-numbered">{parts}</div>;
        }
        return <div key={i} className="coach-line">{parts}</div>;
      })}
    </div>
  );
}

function CoachView() {
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [response, setResponseRaw] = useState(() => localStorage.getItem('coach-response') || '');
  const [loading, setLoading] = useState(false);
  const [mode, setModeRaw] = useState(() => localStorage.getItem('coach-mode') || 'kickoff');
  const [hasKey, setHasKey] = useState(true);
  const [draftContext, setDraftContext] = useState('');
  const [draftChannel, setDraftChannel] = useState('slack');

  const setResponse = (text) => {
    setResponseRaw(text);
    localStorage.setItem('coach-response', text);
  };

  const setMode = (m) => {
    setModeRaw(m);
    localStorage.setItem('coach-mode', m);
  };

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getSessions(today),
    ]).then(([t, s]) => {
      setTasks(t);
      setSessions(s);
    });
  }, []);

  const pending = tasks.filter(t => !t.done);

  const runKickoff = async () => {
    if (pending.length === 0) {
      setResponse('No pending tasks. Add some in the Today tab first, then come back for your kickoff.');
      return;
    }
    setLoading(true);
    setResponse('');
    try {
      const text = await window.electronAPI.claudeKickoff(pending);
      setResponse(text);
    } catch (e) {
      setHasKey(false);
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const runReview = async () => {
    setLoading(true);
    setResponse('');
    try {
      const text = await window.electronAPI.claudeReview({ tasks, sessions });
      setResponse(text);
    } catch (e) {
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const runDraft = async () => {
    if (!draftContext.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const text = await window.electronAPI.claudeDraft({ channel: draftChannel, context: draftContext });
      setResponse(text);
    } catch (e) {
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Mode switcher */}
      <div className="coach-tabs">
        {[['kickoff', 'Morning Kickoff'], ['review', 'End-of-Day Review'], ['draft', 'Draft a Message']].map(([key, label]) => (
          <button
            key={key}
            className={`coach-tab ${mode === key ? 'active' : ''}`}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Kickoff */}
      {mode === 'kickoff' && (
        <div className="coach-panel">
          <p className="coach-desc">
            Claude will look at your {pending.length} pending task{pending.length !== 1 ? 's' : ''} and suggest a plan for today.
          </p>
          {pending.length > 0 && (
            <div className="coach-task-preview">
              {pending.map(t => (
                <div key={t.id} className="coach-task-row">
                  <span className={`priority-badge priority-${t.priority === 'high' ? 'high' : t.priority === 'med' ? 'med' : 'low'}`}>{t.priority}</span>
                  <span>{t.title}</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={runKickoff} disabled={loading}>
            {loading ? 'Thinking...' : 'Get my plan'}
          </button>
        </div>
      )}

      {/* Review */}
      {mode === 'review' && (
        <div className="coach-panel">
          <p className="coach-desc">
            Claude will review your day — {tasks.filter(t => t.done).length} tasks done, {pending.length} pending, {sessions.length} pomodoros logged.
          </p>
          <button className="btn btn-primary" onClick={runReview} disabled={loading}>
            {loading ? 'Thinking...' : 'Review my day'}
          </button>
        </div>
      )}

      {/* Draft */}
      {mode === 'draft' && (
        <div className="coach-panel">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select className="select" value={draftChannel} onChange={e => setDraftChannel(e.target.value)}>
              <option value="slack">Slack</option>
              <option value="email">Email</option>
              <option value="text">Text</option>
            </select>
          </div>
          <textarea
            className="input"
            style={{ width: '100%', height: 90, resize: 'none', marginBottom: 10 }}
            placeholder="Describe what you need to communicate. e.g. 'Tell my team the data pipeline is delayed by 2 days and we'll have an update Friday.'"
            value={draftContext}
            onChange={e => setDraftContext(e.target.value)}
          />
          <button className="btn btn-primary" onClick={runDraft} disabled={loading || !draftContext.trim()}>
            {loading ? 'Drafting...' : 'Draft message'}
          </button>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="coach-response-wrap">
          <MarkdownText text={response} />
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12, fontSize: 12 }}
            onClick={() => navigator.clipboard.writeText(response)}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Insert markdown syntax around selection or at cursor
function insertFormat(textarea, before, after = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const replacement = before + (selected || 'text') + after;
  const newVal = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  return { value: newVal, cursor: start + before.length + (selected || 'text').length + after.length };
}

function FormatToolbar({ textareaRef, value, onChange }) {
  const apply = (before, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value: newVal, cursor } = insertFormat(ta, before, after);
    onChange(newVal);
    // Restore focus + cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const tools = [
    { label: 'B',  title: 'Bold',          action: () => apply('**', '**'),   style: { fontWeight: 700 } },
    { label: 'I',  title: 'Italic',         action: () => apply('_', '_'),     style: { fontStyle: 'italic' } },
    { label: 'H',  title: 'Heading',        action: () => apply('## '),        style: {} },
    { label: '•',  title: 'Bullet point',   action: () => apply('- '),         style: {} },
    { label: '1.', title: 'Numbered list',  action: () => apply('1. '),        style: { fontFamily: 'monospace' } },
  ];

  return (
    <div className="format-toolbar">
      {tools.map(t => (
        <button key={t.label} className="format-btn" title={t.title} style={t.style} onClick={t.action}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function renderMarkdown(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Apply inline bold + italic
    const inline = (str) => {
      const parts = str.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
      return parts.map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('_') && p.endsWith('_')) return <em key={j}>{p.slice(1, -1)}</em>;
        return p;
      });
    };

    if (!line.trim()) return <br key={i} />;
    if (/^### /.test(line)) return <div key={i} className="note-h3">{inline(line.slice(4))}</div>;
    if (/^## /.test(line))  return <div key={i} className="note-h2">{inline(line.slice(3))}</div>;
    if (/^# /.test(line))   return <div key={i} className="note-h1">{inline(line.slice(2))}</div>;
    if (/^[\-\*] /.test(line)) return <div key={i} className="note-bullet">• {inline(line.slice(2))}</div>;
    if (/^\d+\. /.test(line))  return <div key={i} className="note-numbered">{inline(line)}</div>;
    return <div key={i} className="note-line">{inline(line)}</div>;
  });
}

function NoteCard({ note, onDelete, onSummarize }) {
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(note.summary || '');

  const handleSummarize = async () => {
    setSummarizing(true);
    const text = await onSummarize(note.id, note.content);
    setSummary(text);
    setSummarizing(false);
  };

  return (
    <div className="note-card">
      <div className="note-content">{renderMarkdown(note.content)}</div>
      {summary && (
        <div className="note-summary">
          <span className="note-summary-label">Summary</span>
          <div>{summary}</div>
        </div>
      )}
      <div className="note-footer">
        <span className="note-time">{timeAgo(note.createdAt)}</span>
        <div className="note-actions">
          <button className="note-btn" onClick={handleSummarize} disabled={summarizing}>
            {summarizing ? 'Summarizing...' : summary ? 'Re-summarize' : 'Summarize'}
          </button>
          <button className="note-btn note-btn-delete" onClick={() => onDelete(note.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function NotesView() {
  const [notes, setNotes] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const textareaRef = React.useRef(null);

  useEffect(() => {
    window.electronAPI.getNotes().then(n => {
      setNotes(n);
      setLoading(false);
    });
  }, []);

  const addNote = async () => {
    if (!newContent.trim()) return;
    const note = await window.electronAPI.addNote({ content: newContent.trim() });
    setNotes(prev => [note, ...prev]);
    setNewContent('');
  };

  const deleteNote = async (id) => {
    await window.electronAPI.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const summarizeNote = async (id, content) => {
    const summary = await window.electronAPI.claudeSummarize(content);
    await window.electronAPI.updateNote(id, { summary });
    setNotes(prev => prev.map(n => n.id === id ? { ...n, summary } : n));
    return summary;
  };

  if (loading) return <div className="placeholder"><div className="label">Loading...</div></div>;

  return (
    <div>
      <div className="section-title">Notes — {notes.length} total</div>

      <div className="note-compose">
        <FormatToolbar textareaRef={textareaRef} value={newContent} onChange={setNewContent} />
        <textarea
          ref={textareaRef}
          className="input"
          style={{ width: '100%', height: 100, resize: 'vertical', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          placeholder="Write a note... use toolbar for Bold, Italic, Headings, Bullets. Shift+Enter for newline, Enter to save."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              addNote();
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-primary" onClick={addNote} disabled={!newContent.trim()}>
            Save note
          </button>
        </div>
      </div>

      {notes.length === 0 && (
        <div className="empty-state" style={{ marginTop: 16 }}>No notes yet. Write one above.</div>
      )}

      <div className="note-list">
        {notes.map(n => (
          <NoteCard key={n.id} note={n} onDelete={deleteNote} onSummarize={summarizeNote} />
        ))}
      </div>
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
        <span className="titlebar-title">⚡ Holocron</span>
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
        <div style={{ display: activeTab === 'Today' ? 'block' : 'none' }}><TodayView /></div>
        <div style={{ display: activeTab === 'Focus' ? 'block' : 'none' }}><FocusView /></div>
        <div style={{ display: activeTab === 'Notes' ? 'block' : 'none' }}><NotesView /></div>
        <div style={{ display: activeTab === 'Coach' ? 'block' : 'none' }}><CoachView /></div>
      </div>

      {showCapture && <QuickCapture onClose={closeCapture} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
