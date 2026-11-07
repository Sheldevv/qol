import { load } from '../store';
import {
  Wallet, KanbanSquare, NotebookPen, Sparkles, TrendingUp, Calendar, GraduationCap,
} from 'lucide-react';
import ProgressRing from './ProgressRing';

export default function Dashboard() {
  const data = load();
  const money = data.money || { income: 0, txns: [] };
  const spent = money.txns.reduce((s, t) => s + t.amount, 0);
  const tasks = data.tasks || [];
  const open = tasks.filter(t => t.col !== 'done').length;
  const done = tasks.filter(t => t.col === 'done').length;
  const notes = (data.notes || []).length;
  const school = data.school || [];
  const habits = data.habits || [];
  const habitsDone = habits.filter(h =>
    h.log?.includes(new Date().toISOString().slice(0, 10))
  ).length;

  const today = new Date().toLocaleDateString('en', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const upcoming = [...school]
    .filter(s => s.due && !s.done && new Date(s.due) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 5);

  const Stat = ({ icon: Icon, label, value, accent, sub }) => (
    <div className="bg-panel border border-border rounded-2xl p-5 hover:border-border-strong transition">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${accent.bg} ${accent.text}`}>
        <Icon size={18} />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-sm text-muted">{today}</p>
        <h2 className="text-3xl font-bold mt-1 tracking-tight">Welcome back 👋</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label="Spent this month" value={`$${spent.toFixed(0)}`}
          accent={{ bg: 'bg-pink-500/10', text: 'text-pink-400' }}
          sub={money.income ? `of $${money.income.toFixed(0)} budget` : 'Set income in Money'} />
        <Stat icon={KanbanSquare} label="Open tasks" value={open}
          accent={{ bg: 'bg-yellow-500/10', text: 'text-yellow-400' }}
          sub={`${done} completed`} />
        <Stat icon={NotebookPen} label="Notes" value={notes}
          accent={{ bg: 'bg-blue-500/10', text: 'text-blue-400' }}
          sub="Total saved" />
        <Stat icon={Sparkles} label="Habits" value={`${habitsDone}/${habits.length}`}
          accent={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400' }}
          sub="Done today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-panel border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Budget progress</h3>
            <TrendingUp size={16} className="text-muted" />
          </div>
          {money.income > 0 ? (
            <div className="flex items-center gap-6">
              <ProgressRing value={spent} max={money.income} size={130} stroke={11}>
                <div className="text-center">
                  <p className="text-2xl font-bold">{Math.round((spent / money.income) * 100)}%</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">used</p>
                </div>
              </ProgressRing>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-xs text-muted">Budget</p>
                  <p className="font-semibold">${money.income.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Spent</p>
                  <p className="font-semibold text-pink-400">${spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Left</p>
                  <p className={`font-semibold ${money.income - spent < 0 ? 'text-danger' : 'text-success'}`}>
                    ${(money.income - spent).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="mx-auto text-muted mb-2" size={28} />
              <p className="text-sm text-muted">Set a monthly income in Money to see progress.</p>
            </div>
          )}
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Upcoming deadlines</h3>
            <Calendar size={16} className="text-muted" />
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="mx-auto text-muted mb-2" size={28} />
              <p className="text-sm text-muted">Nothing due. Nice work!</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {upcoming.map(s => {
                const days = Math.ceil((new Date(s.due) - new Date()) / (1000 * 60 * 60 * 24));
                const urgent = days <= 2;
                return (
                  <li key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.assign}</p>
                      <p className="text-xs text-muted truncate">{s.class}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                      urgent ? 'bg-danger/10 text-danger' : 'bg-border text-muted'
                    }`}>
                      {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}