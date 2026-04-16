import { Users, BarChart2, FileText, Settings, Activity, Clock, Wrench, Stethoscope } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Users,     label: 'Patient Queue', id: 'queue'    },
  { icon: Clock,     label: 'History',       id: 'history'  },
  { icon: BarChart2, label: 'Analytics',     id: 'analytics', soon: true },
  { icon: FileText,  label: 'Reports',       id: 'reports',   soon: true },
]

const TOOL_ITEMS = [
  { icon: Stethoscope, label: 'AI Consultant', id: 'consult' },
  { icon: Wrench,      label: 'Tools',         id: 'tools'   },
]

export default function Sidebar({ currentView, onViewChange, onOpenSettings }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={20} strokeWidth={2} />
        </div>
        <div>
          <div className="sidebar-logo-name">Vascular</div>
          <div className="sidebar-logo-sub">Flow</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Workspace</p>
        {NAV_ITEMS.map(({ icon: Icon, label, id, soon }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${currentView === id ? 'active' : ''} ${soon ? 'soon' : ''}`}
            disabled={soon}
            onClick={() => !soon && onViewChange(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {soon && <span className="soon-badge">Soon</span>}
          </button>
        ))}

        <p className="sidebar-section-label" style={{ marginTop: '16px' }}>Tools</p>
        {TOOL_ITEMS.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${currentView === id ? 'active' : ''}`}
            onClick={() => onViewChange(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-nav-item" onClick={onOpenSettings}>
          <Settings size={17} />
          <span>Settings</span>
        </button>
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <Activity size={14} />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">Vascular Surgery</span>
            <span className="sidebar-user-role">Department</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
