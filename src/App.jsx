import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CommandPalette from './components/CommandPalette';
import Money from './views/Money';
import Tasks from './views/Tasks';
import Notes from './views/Notes';
import School from './views/School';
import Habits from './views/Habits';
import Pomodoro from './views/Pomodoro';
import Projects from './views/Projects';
import ProjectView from './views/ProjectView';
import { migrate } from './store';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => { migrate(); }, []);

  const VIEWS = {
    dashboard: <Dashboard />,
    projects: <Projects onOpen={(id) => { setActiveProjectId(id); setView('project'); }} />,
    project: activeProjectId ? (
      <ProjectView projectId={activeProjectId} onBack={() => setView('projects')} />
    ) : null,
    money: <Money />,
    tasks: <Tasks />,
    notes: <Notes />,
    school: <School />,
    habits: <Habits />,
    pomodoro: <Pomodoro />,
  };

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      const SHORTCUTS = {
        '1': 'dashboard', '2': 'projects', '3': 'money',
        '4': 'tasks', '5': 'notes', '6': 'school',
        '7': 'habits', '8': 'pomodoro',
      };
      if (meta && SHORTCUTS[e.key]) {
        e.preventDefault();
        setView(SHORTCUTS[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        current={view === 'project' ? 'projects' : view}
        onNavigate={setView}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <div key={view + (activeProjectId || '')} className="animate-fade-in">
          {VIEWS[view]}
        </div>
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setView}
      />
    </div>
  );
}