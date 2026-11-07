import { useEffect, useMemo, useState } from 'react';
import { load, save } from '../store';
import { useToast } from '../components/Toast';
import { Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import ProgressRing from '../components/ProgressRing';

const BUCKETS = [
  { id: 'needs', label: 'Needs', pct: 0.5, color: '#60a5fa', text: 'text-blue-400' },
  { id: 'wants', label: 'Wants', pct: 0.3, color: '#f472b6', text: 'text-pink-400' },
  { id: 'savings', label: 'Savings', pct: 0.2, color: '#34d399', text: 'text-emerald-400' },
];

export default function Money() {
  const [state, setState] = useState(() => load().money || { income: 0, txns: [] });
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [bucket, setBucket] = useState('needs');
  const toast = useToast();

  useEffect(() => {
    const all = load();
    all.money = state;
    save(all);
  }, [state]);

  const totals = useMemo(() => {
    const t = { needs: 0, wants: 0, savings: 0 };
    state.txns.forEach(x => { if (t[x.bucket] !== undefined) t[x.bucket] += x.amount; });
    return t;
  }, [state.txns]);

  const totalSpent = Object.values(totals).reduce((s, v) => s + v, 0);
  const left = state.income - totalSpent;

  const add = () => {
    const n = parseFloat(amt);
    if (!desc.trim() || isNaN(n) || n <= 0) return;
    setState(s => ({ ...s, txns: [...s.txns, { id: crypto.randomUUID(), desc, amount: n, bucket }] }));
    setDesc(''); setAmt('');
  };

  const remove = (id) => {
    const removed = state.txns.find(t => t.id === id);
    const index = state.txns.findIndex(t => t.id === id);
    setState(s => ({ ...s, txns: s.txns.filter(t => t.id !== id) }));
    if (removed) {
      toast(`Deleted "${removed.desc}"`, () => {
        setState(s => {
          const next = [...s.txns];
          next.splice(index, 0, removed);
          return { ...s, txns: next };
        });
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">💰 Money</h2>
        <p className="text-sm text-muted mt-1">Track spending with the 50/30/20 rule.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel border border-border rounded-2xl p-5">
          <label className="text-sm text-muted">Monthly income</label>
          <input
            type="number" min="0" step="0.01"
            value={state.income || ''}
            onChange={e => setState(s => ({ ...s, income: parseFloat(e.target.value) || 0 }))}
            className="mt-2 w-full bg-transparent text-2xl font-bold focus:outline-none border-b border-border pb-1"
            placeholder="$0.00"
          />
        </div>
        <div className="bg-panel border border-border rounded-2xl p-5">
          <p className="text-sm text-muted flex items-center gap-1.5"><TrendingDown size={14} /> Spent</p>
          <p className="text-2xl font-bold mt-2 text-pink-400">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-panel border border-border rounded-2xl p-5">
          <p className="text-sm text-muted flex items-center gap-1.5"><TrendingUp size={14} /> Left</p>
          <p className={`text-2xl font-bold mt-2 ${left < 0 ? 'text-danger' : 'text-success'}`}>
            ${left.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BUCKETS.map(b => {
          const target = (state.income || 0) * b.pct;
          const spent = totals[b.id];
          const over = spent > target && target > 0;
          return (
            <div key={b.id} className="bg-panel border border-border rounded-2xl p-5 flex flex-col items-center">
              <div className="w-full flex justify-between items-baseline mb-4">
                <span className={`text-sm font-semibold ${b.text}`}>{b.label}</span>
                <span className="text-xs text-muted">{Math.round(b.pct * 100)}%</span>
              </div>
              <ProgressRing value={spent} max={target || 1} size={130} stroke={11} color={over ? '#f87171' : b.color}>
                <div className="text-center">
                  <p className="text-lg font-bold">${spent.toFixed(0)}</p>
                  <p className="text-[10px] text-muted">of ${target.toFixed(0)}</p>
                </div>
              </ProgressRing>
              <p className={`text-xs mt-4 ${over ? 'text-danger' : 'text-muted'}`}>
                {target === 0 ? 'Set income to see budget'
                  : over ? `$${(spent - target).toFixed(2)} over`
                  : `$${(target - spent).toFixed(2)} left`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-panel border border-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description"
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent" />
          <input type="number" min="0" step="0.01" value={amt}
            onChange={e => setAmt(e.target.value)}
            placeholder="Amount"
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent" />
          <select value={bucket} onChange={e => setBucket(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent">
            {BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <button onClick={add}
            className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-2xl overflow-hidden">
        {state.txns.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="mx-auto text-muted mb-3" size={32} />
            <p className="text-muted text-sm">No transactions yet.</p>
          </div>
        ) : (
          [...state.txns].reverse().map(t => {
            const b = BUCKETS.find(x => x.id === t.bucket);
            return (
              <div key={t.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-bg/50 transition group">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b?.color }} />
                  <div>
                    <p className="text-sm font-medium">{t.desc}</p>
                    <p className="text-xs text-muted capitalize">{b?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">${t.amount.toFixed(2)}</span>
                  <button onClick={() => remove(t.id)}
                    className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}