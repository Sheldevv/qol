import { useEffect, useState } from 'react';
import { load, save } from '../store';
import { useToast } from '../components/Toast';
import { Plus, Trash2, Check, Flame, Sparkles } from 'lucide-react';

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function Habits() {
  const [habits, setHabits] = useState(() => load().habits || []);
  const [draft, setDraft] = useState('');
  const toast = useToast();

  useEffect(() => {
    const all = load(); all.habits = habits; save(all);
  }, [habits]);

  const add = () => {
    if (!draft.trim()) return;
    setHabits(hs => [...hs, { id: crypto.randomUUID(), name: draft.trim(), log: [] }]);
    setDraft('');
  };

  const remove = (id) => {
    const removed = habits.find(h => h.id === id);
    const index = habits.findIndex(h => h.id === id);
    setHabits(hs => hs.filter(h => h.id !== id));
    if (removed) {
      toast(`Deleted "${removed.name}"`, () => {
        setHabits(hs => {
          const next = [...hs];
          next.splice(index, 0, removed);
          return next;
        });
      });
    }
  };

  const toggleToday = (id) => {
    const key = todayKey();
    setHabits(hs => hs.map(h => h.id === id ? {
      ...h,
      log: h.log.includes(key) ? h.log.filter(d => d !== key) : [...h.log, key],
    } : h));
  };

  const streak = (habit) => {
    let count = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (habit.log.includes(key)) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">✨ Habits</h2>
        <p className="text-sm text-muted mt-1">Build consistency, one day at a time.</p>
      </div>

      <div className="bg-panel border border-border rounded-2xl p-4 flex gap-3">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="New habit (e.g. Read 20 min)"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
        />
        <button onClick={add}
          className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 font-medium flex items-center gap-2">
          <Plus size={16} /> Add
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-12 text-center">
          <Sparkles className="mx-auto text-muted mb-3" size={32} />
          <p className="text-muted">No habits yet. Add one above to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(h => {
            const doneToday = h.log.includes(todayKey());
            const s = streak(h);
            return (
              <div key={h.id} className="bg-panel border border-border rounded-2xl p-4 flex items-center gap-4 group">
                <button
                  onClick={() => toggleToday(h.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                    doneToday ? 'bg-success text-white' : 'border-2 border-border hover:border-accent'
                  }`}
                >
                  <Check size={18} strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${doneToday ? 'text-muted' : ''}`}>{h.name}</p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-1">
                    {s > 0 ? <><Flame size={12} className="text-warning" /> {s} day{s !== 1 ? 's' : ''} streak</> : 'No streak yet'}
                  </p>
                </div>
                <div className="hidden sm:flex gap-1 flex-shrink-0">
                  {days.map(d => (
                    <div key={d.key} className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs transition ${
                        h.log.includes(d.key) ? 'bg-accent/20 text-accent' : 'bg-bg border border-border'
                      }`}>
                        {h.log.includes(d.key) && '✓'}
                      </div>
                      <span className="text-[10px] text-muted">{d.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => remove(h.id)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}