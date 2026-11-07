import { useEffect, useMemo, useRef, useState } from 'react';
import { load, save } from '../store';
import {
  Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX,
  Timer, Coffee, Sparkles, Flag, ChevronDown, X, Check,
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  work: 25,
  break: 5,
  longBreak: 15,
  longBreakEvery: 4,
  autoStart: false,
  sound: true,
};

const SETTINGS_KEY = 'qol-pomo-settings';
const HISTORY_KEY = 'qol-pomo-history';

const loadSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return DEFAULT_SETTINGS; }
};

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    o.type = 'sine';
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {}
};

// Simple brown noise generator for "focus mode"
let noiseCtx = null;
let noiseNode = null;
const startNoise = () => {
  if (noiseNode) return;
  try {
    noiseCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 4096;
    const buffer = noiseCtx.createBuffer(1, bufferSize, noiseCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
    noiseNode = noiseCtx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    const gain = noiseCtx.createGain();
    gain.gain.value = 0.08;
    noiseNode.connect(gain).connect(noiseCtx.destination);
    noiseNode.start();
  } catch {}
};
const stopNoise = () => {
  try { noiseNode?.stop(); noiseNode?.disconnect(); } catch {}
  noiseNode = null;
  try { noiseCtx?.close(); } catch {}
  noiseCtx = null;
};

export default function Pomodoro() {
  const [settings, setSettings] = useState(loadSettings);
  const [history, setHistory] = useState(loadHistory);
  const [mode, setMode] = useState('work'); // work | break | longBreak
  const [seconds, setSeconds] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [noiseOn, setNoiseOn] = useState(false);
  const tickRef = useRef(null);
  const sessionStartRef = useRef(null);

  // Persist
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history)), [history]);

  // When durations change and timer is idle, reset to new duration
  useEffect(() => {
    if (!running) {
      setSeconds(settings[mode] * 60);
    }
  }, [settings.work, settings.break, settings.longBreak, mode]);

  // Tick
  useEffect(() => {
    if (!running) { clearInterval(tickRef.current); return; }
    sessionStartRef.current ??= Date.now();
    tickRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          finishSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, mode]);

  // Document title
  useEffect(() => {
    const label = mode === 'work' ? 'Focus' : mode === 'longBreak' ? 'Long break' : 'Break';
    document.title = running ? `${fmt(seconds)} — ${label}` : 'QoL';
    return () => { document.title = 'QoL'; };
  }, [seconds, running, mode]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); setRunning(r => !r); }
      if (e.key === 'r' || e.key === 'R') resetTimer();
      if (e.key === 's' || e.key === 'S') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // Ambient noise control
  useEffect(() => {
    if (noiseOn && running && mode === 'work') startNoise();
    else stopNoise();
    return () => { if (!noiseOn) stopNoise(); };
  }, [noiseOn, running, mode]);

  useEffect(() => () => stopNoise(), []);

  const finishSession = () => {
    setRunning(false);
    if (settings.sound) beep();

    if (mode === 'work') {
      // Log
      setHistory(h => [...h, {
        type: 'work',
        taskId: focusTask?.id || null,
        taskText: focusTask?.text || null,
        minutes: settings.work,
        at: Date.now(),
      }]);

      // Decide next mode
      const doneToday = countWorkToday(history) + 1;
      const nextMode =
        doneToday % settings.longBreakEvery === 0 ? 'longBreak' : 'break';

      setMode(nextMode);
      setSeconds(settings[nextMode] * 60);
      if (settings.autoStart) setRunning(true);
    } else {
      setMode('work');
      setSeconds(settings.work * 60);
      if (settings.autoStart) setRunning(true);
    }
    sessionStartRef.current = null;
  };

  const skip = () => {
    setRunning(false);
    sessionStartRef.current = null;
    if (mode === 'work') {
      const doneToday = countWorkToday(history) + 1;
      const nextMode = doneToday % settings.longBreakEvery === 0 ? 'longBreak' : 'break';
      setMode(nextMode);
      setSeconds(settings[nextMode] * 60);
    } else {
      setMode('work');
      setSeconds(settings.work * 60);
    }
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(settings[mode] * 60);
    sessionStartRef.current = null;
  };

  const switchMode = (m) => {
    setRunning(false);
    setMode(m);
    setSeconds(settings[m] * 60);
    sessionStartRef.current = null;
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = Date.now() - 7 * 86400000;
    const workSessions = history.filter(h => h.type === 'work');
    const today = workSessions.filter(h => h.at >= startOfToday);
    const week = workSessions.filter(h => h.at >= weekAgo);
    return {
      todayCount: today.length,
      todayMin: today.reduce((s, h) => s + h.minutes, 0),
      weekCount: week.length,
      weekMin: week.reduce((s, h) => s + h.minutes, 0),
      totalCount: workSessions.length,
      totalMin: workSessions.reduce((s, h) => s + h.minutes, 0),
    };
  }, [history]);

  const total = settings[mode] * 60;
  const pct = (total - seconds) / total;
  const color =
    mode === 'work' ? 'var(--color-accent)'
    : mode === 'longBreak' ? 'var(--color-warning)'
    : 'var(--color-success)';

  // Tasks available for focus
  const tasks = useMemo(() => {
    const t = load().tasks || [];
    return t.filter(x => x.col !== 'done');
  }, [showTaskPicker]);

  const modeLabel = mode === 'work' ? 'Focus' : mode === 'longBreak' ? 'Long break' : 'Break';
  const ModeIcon = mode === 'work' ? Timer : mode === 'longBreak' ? Sparkles : Coffee;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">🍅 Pomodoro</h2>
          <p className="text-sm text-muted mt-1">
            Focus sessions with automatic breaks and stats.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`p-2 rounded-lg border border-border transition ${
            showSettings ? 'bg-accent text-white border-accent' : 'text-muted hover:text-ink hover:bg-border'
          }`}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-panel border border-border rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'work', label: 'Focus (min)', min: 1, max: 120 },
              { key: 'break', label: 'Break (min)', min: 1, max: 30 },
              { key: 'longBreak', label: 'Long break (min)', min: 5, max: 60 },
              { key: 'longBreakEvery', label: 'Long break every', min: 2, max: 10 },
            ].map(f => (
              <label key={f.key} className="text-xs">
                <span className="text-muted">{f.label}</span>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={settings[f.key]}
                  onChange={e => {
                    const v = Math.max(f.min, Math.min(f.max, parseInt(e.target.value) || f.min));
                    setSettings(s => ({ ...s, [f.key]: v }));
                  }}
                  className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={e => setSettings(s => ({ ...s, autoStart: e.target.checked }))}
                className="accent-accent"
              />
              <span className="text-muted">Auto-start next session</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={e => setSettings(s => ({ ...s, sound: e.target.checked }))}
                className="accent-accent"
              />
              <span className="text-muted">Sound on session end</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noiseOn}
                onChange={e => setNoiseOn(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-muted">Brown noise while focusing</span>
            </label>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted">Today</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{stats.todayCount}</p>
          <p className="text-xs text-muted">{stats.todayMin} min</p>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted">This week</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{stats.weekCount}</p>
          <p className="text-xs text-muted">{Math.round(stats.weekMin / 60 * 10) / 10} h</p>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted">All time</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{stats.totalCount}</p>
          <p className="text-xs text-muted">{Math.round(stats.totalMin / 60 * 10) / 10} h</p>
        </div>
      </div>

      {/* Timer card */}
      <div className="bg-panel border border-border rounded-2xl p-8 flex flex-col items-center">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-bg border border-border rounded-lg p-1 mb-6">
          {[
            { id: 'work', label: 'Focus', Icon: Timer },
            { id: 'break', label: 'Break', Icon: Coffee },
            { id: 'longBreak', label: 'Long', Icon: Sparkles },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                mode === m.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
            >
              <m.Icon size={12} /> {m.label}
            </button>
          ))}
        </div>

        {/* Ring */}
        <div className="relative w-80 h-80">
          <svg width="320" height="320" className="-rotate-90">
            <circle cx="160" cy="160" r="144" fill="none" stroke="var(--color-border)" strokeWidth="14" />
            <circle
              cx="160" cy="160" r="144"
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeDasharray={2 * Math.PI * 144}
              strokeDashoffset={2 * Math.PI * 144 * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted uppercase tracking-widest mb-2">
              <ModeIcon size={14} /> {modeLabel}
            </div>
            <span className="text-6xl font-bold tabular-nums tracking-tighter">{fmt(seconds)}</span>
            {focusTask ? (
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg border border-border text-xs max-w-[200px]">
                <Flag size={10} className="text-accent flex-shrink-0" />
                <span className="truncate">{focusTask.text}</span>
                <button
                  onClick={() => setFocusTask(null)}
                  className="text-muted hover:text-danger flex-shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTaskPicker(true)}
                className="mt-3 text-xs text-muted hover:text-accent flex items-center gap-1"
              >
                <Flag size={10} /> Pick a task
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-8">
          <button
            onClick={() => setRunning(r => !r)}
            className="bg-accent hover:opacity-90 text-white rounded-xl px-8 py-3 font-medium flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            {running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
          </button>
          <button
            onClick={resetTimer}
            title="Reset (R)"
            className="bg-bg border border-border rounded-xl px-4 py-3 text-muted hover:text-ink flex items-center gap-2"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={skip}
            title="Skip (S)"
            className="bg-bg border border-border rounded-xl px-4 py-3 text-muted hover:text-ink flex items-center gap-2"
          >
            <SkipForward size={18} />
          </button>
          <button
            onClick={() => setNoiseOn(n => !n)}
            title={noiseOn ? 'Turn off noise' : 'Turn on brown noise'}
            className={`rounded-xl px-4 py-3 flex items-center gap-2 border transition ${
              noiseOn
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-bg border-border text-muted hover:text-ink'
            }`}
          >
            {noiseOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        <p className="text-xs text-muted mt-4">
          <kbd className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs">Space</kbd> start ·{' '}
          <kbd className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs">R</kbd> reset ·{' '}
          <kbd className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs">S</kbd> skip
        </p>
      </div>

      {/* History */}
      <div className="bg-panel border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHistory(s => !s)}
          className="w-full flex items-center justify-between p-4 hover:bg-bg/40 transition"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Timer size={14} className="text-muted" /> Session history
            <span className="text-xs text-muted font-normal">
              ({history.length})
            </span>
          </h3>
          <ChevronDown
            size={16}
            className={`text-muted transition ${showHistory ? 'rotate-180' : ''}`}
          />
        </button>
        {showHistory && (
          <div className="border-t border-border max-h-80 overflow-y-auto animate-fade-in">
            {history.length === 0 ? (
              <p className="text-center text-muted text-sm p-8">
                No sessions yet. Start focusing to see your history.
              </p>
            ) : (
              [...history].reverse().map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border-b border-border last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Timer size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {h.taskText || 'Focus session'}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(h.at).toLocaleString('en', {
                        weekday: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-muted tabular-nums flex-shrink-0">
                    {h.minutes} min
                  </span>
                </div>
              ))
            )}
            {history.length > 0 && (
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => {
                    if (confirm('Clear all session history?')) setHistory([]);
                  }}
                  className="text-xs text-danger hover:underline"
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task picker modal */}
      {showTaskPicker && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setShowTaskPicker(false)}
        >
          <div
            className="bg-panel border border-border-strong rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">What are you focusing on?</h3>
              <button onClick={() => setShowTaskPicker(false)} className="text-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-center text-muted text-sm p-8">
                  No open tasks. Add some in the Tasks tab first.
                </p>
              ) : (
                tasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setFocusTask(t); setShowTaskPicker(false); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-bg text-left border-b border-border last:border-0 transition"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      t.col === 'doing' ? 'bg-warning' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{t.text}</p>
                      <p className="text-xs text-muted capitalize">{t.col.replace('todo', 'to do')}</p>
                    </div>
                    {focusTask?.id === t.id && <Check size={16} className="text-accent" />}
                  </button>
                ))
              )}
            </div>
            {focusTask && (
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => { setFocusTask(null); setShowTaskPicker(false); }}
                  className="text-xs text-muted hover:text-danger"
                >
                  Clear focus task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}