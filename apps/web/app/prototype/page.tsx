'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Command, Gauge, Grid2X2, Inbox, LayoutDashboard, List, MoreHorizontal, Plus, Search, Settings2, Sparkles, Target, Users, X, Zap } from 'lucide-react'

type Status = 'Todo' | 'In progress' | 'Review' | 'Done'
type Task = { id: string; code: string; title: string; status: Status; priority: 'Urgent' | 'High' | 'Medium'; due: string; assignee: string; initials: string; color: string; label: string }

const initialTasks: Task[] = [
  { id: '1', code: 'ORB-128', title: 'Polish responsive navigation', status: 'In progress', priority: 'High', due: 'Today', assignee: 'Maya Chen', initials: 'MC', color: '#8b5cf6', label: 'Design' },
  { id: '2', code: 'ORB-127', title: 'Review onboarding copy', status: 'Review', priority: 'Medium', due: 'Tomorrow', assignee: 'Alex Kim', initials: 'AK', color: '#f97316', label: 'Content' },
  { id: '3', code: 'ORB-124', title: 'Set up Supabase project', status: 'Done', priority: 'High', due: 'Oct 11', assignee: 'Minh Tran', initials: 'MT', color: '#22c55e', label: 'Engineering' },
  { id: '4', code: 'ORB-122', title: 'Map project health signals', status: 'Todo', priority: 'Urgent', due: 'Oct 17', assignee: 'You', initials: 'YO', color: '#0ea5e9', label: 'Research' },
  { id: '5', code: 'ORB-119', title: 'Create empty states for views', status: 'Todo', priority: 'Medium', due: 'Oct 18', assignee: 'Maya Chen', initials: 'MC', color: '#8b5cf6', label: 'Design' },
]

const nav = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'My work', icon: Check, count: 8 }, { label: 'Inbox', icon: Inbox, count: 3 },
]
const projects = [{ name: 'Orbit launch', color: '#8b5cf6', progress: 68 }, { name: 'Website refresh', color: '#f97316', progress: 42 }, { name: 'Growth experiments', color: '#14b8a6', progress: 25 }]

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks)
  const [active, setActive] = useState('Overview')
  const [view, setView] = useState<'List' | 'Board'>('List')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [dark, setDark] = useState(false)
  const filtered = useMemo(() => tasks.filter(t => `${t.title} ${t.code} ${t.label}`.toLowerCase().includes(query.toLowerCase())), [tasks, query])

  function cycleStatus(id: string) {
    const order: Status[] = ['Todo', 'In progress', 'Review', 'Done']
    setTasks(current => current.map(t => t.id === id ? { ...t, status: order[(order.indexOf(t.status) + 1) % order.length] } : t))
  }

  function createTask() {
    const title = newTitle.trim()
    if (!title) return
    setTasks(current => [{ id: `local-${Date.now()}`, code: `ORB-${129 + current.length}`, title, status: 'Todo', priority: 'Medium', due: 'No due date', assignee: 'You', initials: 'YO', color: '#0ea5e9', label: 'New' }, ...current])
    setNewTitle('')
    setShowCreate(false)
  }

  return <main className={dark ? 'app dark' : 'app'}>
    <div role="note" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, background: '#fff4d4', color: '#624e0b', padding: '10px 20px', fontSize: 13 }}>Giao diện mẫu SP2 trở đi · Toàn bộ nhiệm vụ và số liệu ở đây là dữ liệu minh họa. <Link href="/">Về SP1</Link></div>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={16} /></div><span>orbit</span><button className="workspace-switcher">Aperture <ChevronDown size={14} /></button></div>
      <div className="profile-row"><div className="avatar avatar-you">YO</div><div><strong>Your workspace</strong><span>Personal space</span></div><MoreHorizontal size={16} className="muted" /></div>
      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        {nav.map(item => <button key={item.label} onClick={() => setActive(item.label)} className={active === item.label ? 'nav-item active' : 'nav-item'}><item.icon size={16} /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>)}
      </div>
      <div className="nav-section project-section"><div className="nav-label"><span>Projects</span><button onClick={() => setShowCreate(true)} className="icon-button"><Plus size={15} /></button></div>
        {projects.map(project => <button className="nav-item" key={project.name} onClick={() => setActive(project.name)}><span className="project-dot" style={{ background: project.color }} />{project.name}</button>)}
      </div>
      <div className="sidebar-bottom"><button className="nav-item"><Settings2 size={16} /><span>Settings</span></button><button className="nav-item"><CircleHelp size={16} /><span>Help & shortcuts</span></button><div className="upgrade"><div className="upgrade-icon"><Zap size={15} /></div><div><strong>Unlock momentum</strong><span>Try advanced reports</span></div><ChevronDown size={15} /></div></div>
    </aside>

    <section className="content">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active === 'Overview' ? 'Overview' : active}</strong></div><div className="top-actions"><button className="search-box"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks..." /><kbd><Command size={11} /> K</kbd></button><button className="round-button"><Bell size={17} /><i /></button><button className="avatar avatar-you">YO</button></div></header>
      <div className="main-scroll"><div className="page-header"><div><div className="eyebrow"><span className="live-dot" /> Monday, October 13, 2026</div><h1>Good morning, Minh <span className="wave">✦</span></h1><p>Here is what is moving across your workspace today.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => setDark(!dark)}>{dark ? 'Light mode' : 'Dark mode'}</button><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16} /> New task</button></div></div>
        <div className="metrics"><Metric icon={<Target size={18} />} label="Project progress" value="68%" detail="+12% this week" tone="purple" /><Metric icon={<Check size={18} />} label="Completed tasks" value="24" detail="8 due this week" tone="green" /><Metric icon={<Clock3 size={18} />} label="Tracked time" value="31h 20m" detail="of 40h planned" tone="orange" /><Metric icon={<Gauge size={18} />} label="Team momentum" value="On track" detail="2 projects at risk" tone="blue" /></div>
        <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><div className="section-kicker">Focus queue</div><h2>Active tasks</h2></div><div className="view-toggle"><button className={view === 'List' ? 'selected' : ''} onClick={() => setView('List')}><List size={15} /> List</button><button className={view === 'Board' ? 'selected' : ''} onClick={() => setView('Board')}><Grid2X2 size={15} /> Board</button></div></div>{view === 'List' ? <TaskList tasks={filtered} onCycle={cycleStatus} /> : <Board tasks={filtered} onCycle={cycleStatus} />}</section><aside className="right-column"><section className="panel progress-panel"><div className="panel-heading"><div><div className="section-kicker">Portfolio</div><h2>Project health</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div><div className="health-ring"><div className="ring"><span>68%</span><small>overall</small></div><div className="health-copy"><strong>Steady momentum</strong><span>Most work is moving on schedule.</span><div className="mini-legend"><i className="green" /> On track <i className="orange" /> At risk</div></div></div>{projects.map(p => <div className="project-progress" key={p.name}><div><span className="project-dot" style={{ background: p.color }} />{p.name}<strong>{p.progress}%</strong></div><div className="progress-track"><span style={{ width: `${p.progress}%`, background: p.color }} /></div></div>)}</section><section className="panel activity-panel"><div className="panel-heading"><div><div className="section-kicker">Live feed</div><h2>Recent activity</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div><ActivityItem initials="AK" color="#f97316" text="moved Review onboarding copy" time="12 min ago" /><ActivityItem initials="MT" color="#22c55e" text="completed Set up Supabase project" time="1 hr ago" /><ActivityItem initials="YO" color="#0ea5e9" text="commented on ORB-128" time="2 hrs ago" /></section></aside></div>
      </div>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-title"><div><div className="section-kicker">Quick capture</div><h2>Create a task</h2></div><button className="more-button" onClick={() => setShowCreate(false)}><X size={18} /></button></div><input className="task-input" autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTask()} placeholder="What needs to happen?" /><div className="modal-row"><button className="chip"><Target size={14} /> Orbit launch</button><button className="chip"><Clock3 size={14} /> Due date</button><button className="chip"><Users size={14} /> Assignee</button></div><div className="modal-footer"><span>Press <kbd>Esc</kbd> to close</span><button className="primary-button" onClick={createTask}><Plus size={15} /> Create task</button></div></div></div>}
  </main>
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function TaskList({ tasks, onCycle }: { tasks: Task[]; onCycle: (id: string) => void }) { return <div className="task-list">{tasks.map(task => <div className="task-row" key={task.id}><button className={`task-check ${task.status === 'Done' ? 'checked' : ''}`} onClick={() => onCycle(task.id)}>{task.status === 'Done' && <Check size={12} />}</button><div className="task-main"><div><span className="task-code">{task.code}</span><strong>{task.title}</strong></div><div className="task-meta"><span className={`status-pill ${task.status.replace(' ', '-').toLowerCase()}`}><i />{task.status}</span><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-label">{task.label}</span></div></div><div className="task-due"><CalendarDays size={14} />{task.due}</div><div className="avatar" style={{ background: task.color }}>{task.initials}</div><button className="more-button"><MoreHorizontal size={16} /></button></div>)}</div> }
function Board({ tasks, onCycle }: { tasks: Task[]; onCycle: (id: string) => void }) { const statuses: Status[] = ['Todo', 'In progress', 'Review', 'Done']; return <div className="board">{statuses.map(status => <div className="board-column" key={status}><div className="column-heading"><span className={`status-dot ${status.replace(' ', '-').toLowerCase()}`} />{status}<em>{tasks.filter(t => t.status === status).length}</em></div>{tasks.filter(t => t.status === status).map(task => <button className="board-card" key={task.id} onClick={() => onCycle(task.id)}><span>{task.code}</span><strong>{task.title}</strong><div><small className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</small><span className="avatar small" style={{ background: task.color }}>{task.initials}</span></div></button>)}</div>)}</div> }
function ActivityItem({ initials, color, text, time }: { initials: string; color: string; text: string; time: string }) { return <div className="activity-item"><span className="avatar small" style={{ background: color }}>{initials}</span><div><p><strong>{initials === 'YO' ? 'You' : initials === 'AK' ? 'Alex Kim' : 'Minh Tran'}</strong> {text}</p><small>{time}</small></div></div> }


