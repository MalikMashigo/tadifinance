import type { ClientType } from '../../types/database'

const typeConfig: Record<ClientType, { label: string; colour: string }> = {
  retail:    { label: 'Retail',    colour: 'blue' },
  stylist:   { label: 'Stylist',   colour: 'accent' },
  media:     { label: 'Media',     colour: 'amber' },
  wholesale: { label: 'Wholesale', colour: 'green' },
}

interface ClientTypeBadgeProps {
  type: ClientType
}

export function ClientTypeBadge({ type }: ClientTypeBadgeProps) {
  const { label, colour } = typeConfig[type] ?? { label: type, colour: 'blue' }
  return <span className={`badge badge--${colour}`}>{label}</span>
}

interface StatusBadgeProps {
  status: string
  map: Record<string, { label: string; colour: string }>
}

export function StatusBadge({ status, map }: StatusBadgeProps) {
  const config = map[status] ?? { label: status, colour: 'blue' }
  return <span className={`badge badge--${config.colour}`}>{config.label}</span>
}
