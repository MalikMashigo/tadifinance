import { Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  actions?: React.ReactNode
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__left">
        <button className="header__menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <h1 className="header__title">{title}</h1>
      </div>
      {actions && <div className="header__actions">{actions}</div>}
    </header>
  )
}
