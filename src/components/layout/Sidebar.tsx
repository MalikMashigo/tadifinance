import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ClipboardList,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  X,
} from 'lucide-react'
import tadiLogo from '../../assets/tadi.jpg'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/orders',   icon: ShoppingBag,   label: 'Orders'   },
  { to: '/quotes',   icon: ClipboardList, label: 'Quotes'   },
  { to: '/invoices', icon: FileText,      label: 'Invoices' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <img src={tadiLogo} alt="TADI wa NASHE" className="sidebar__logo" />
          <span className="sidebar__brand-sub">Finance</span>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={onClose}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span>TADI wa NASHE © 2025</span>
        </div>
      </aside>
    </>
  )
}
