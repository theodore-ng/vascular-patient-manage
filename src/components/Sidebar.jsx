import { Users, SlidersHorizontal, FileText, Settings, Activity, Clock, Wrench, Stethoscope, X } from 'lucide-react'
import { VASCULAR_GROUPS } from '../services/groq'

const SORT_OPTIONS = [
  { key: 'queue',     label: 'Queue order'   },
  { key: 'name-asc',  label: 'Name A → Z'   },
  { key: 'name-desc', label: 'Name Z → A'   },
  { key: 'age-asc',   label: 'Age youngest'  },
  { key: 'age-desc',  label: 'Age oldest'    },
]

const TAG_COLORS = ['red', 'yellow', 'green']
const TAG_LABELS  = { red: 'Red', yellow: 'Yellow', green: 'Green' }

const NAV_ITEMS = [
  { icon: Users,              label: 'Patient Queue', id: 'queue'   },
  { icon: Clock,              label: 'History',       id: 'history' },
  { icon: SlidersHorizontal,  label: 'Filters',       id: 'filters' },
  { icon: FileText,           label: 'Reports',       id: 'reports', soon: true },
]

const TOOL_ITEMS = [
  { icon: Stethoscope, label: 'AI Consultant', id: 'consult' },
  { icon: Wrench,      label: 'Tools',         id: 'tools'   },
]

export default function Sidebar({
  currentView, onViewChange, onOpenSettings,
  filtersOpen, onToggleFilters,
  sortBy, onSortChange,
  tagFilter, onTagFilterChange,
  activeGroupFilter, onGroupFilterChange,
  patients,
}) {
  const activeGroups = VASCULAR_GROUPS.filter(g => patients.some(p => p.group === g))

  const hasActiveFilter = sortBy !== 'queue' || tagFilter || activeGroupFilter

  function handleNavClick(item) {
    if (item.soon) return
    if (item.id === 'filters') {
      onToggleFilters()
    } else {
      onViewChange(item.id)
    }
  }

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
          <div key={id}>
            <button
              className={`sidebar-nav-item ${(id === 'filters' ? filtersOpen : currentView === id) ? 'active' : ''} ${soon ? 'soon' : ''} ${id === 'filters' && hasActiveFilter ? 'sidebar-nav-item--badged' : ''}`}
              disabled={soon}
              onClick={() => handleNavClick({ id, soon })}
            >
              <Icon size={17} />
              <span>{label}</span>
              {soon && <span className="soon-badge">Soon</span>}
              {id === 'filters' && hasActiveFilter && !soon && (
                <span className="filter-active-dot" />
              )}
            </button>

            {/* Expandable filter panel — only under Filters item */}
            {id === 'filters' && filtersOpen && (
              <div className="sidebar-filter-panel">
                {/* Sort */}
                <div className="sidebar-filter-section">
                  <span className="sidebar-filter-label">Sort by</span>
                  <div className="sidebar-filter-chips">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        className={`sidebar-filter-chip ${sortBy === opt.key ? 'sidebar-filter-chip--active' : ''}`}
                        onClick={() => onSortChange(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag */}
                <div className="sidebar-filter-section">
                  <span className="sidebar-filter-label">Tag</span>
                  <div className="sidebar-filter-chips">
                    <button
                      className={`sidebar-filter-chip ${!tagFilter ? 'sidebar-filter-chip--active' : ''}`}
                      onClick={() => onTagFilterChange(null)}
                    >
                      All
                    </button>
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        className={`sidebar-filter-chip sidebar-filter-chip--tag ${tagFilter === c ? 'sidebar-filter-chip--active' : ''}`}
                        onClick={() => onTagFilterChange(tagFilter === c ? null : c)}
                      >
                        <span className={`sf-tag-dot sf-tag-dot--${c}`} />
                        {TAG_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group — only shown if any patient has a group */}
                {activeGroups.length > 0 && (
                  <div className="sidebar-filter-section">
                    <span className="sidebar-filter-label">Group</span>
                    <div className="sidebar-filter-chips">
                      <button
                        className={`sidebar-filter-chip ${!activeGroupFilter ? 'sidebar-filter-chip--active' : ''}`}
                        onClick={() => onGroupFilterChange(null)}
                      >
                        All
                      </button>
                      {activeGroups.map(g => (
                        <button
                          key={g}
                          className={`sidebar-filter-chip ${activeGroupFilter === g ? 'sidebar-filter-chip--active' : ''}`}
                          onClick={() => onGroupFilterChange(activeGroupFilter === g ? null : g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset */}
                {hasActiveFilter && (
                  <button
                    className="sidebar-filter-reset"
                    onClick={() => { onSortChange('queue'); onTagFilterChange(null); onGroupFilterChange(null) }}
                  >
                    <X size={11} /> Reset all filters
                  </button>
                )}
              </div>
            )}
          </div>
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
