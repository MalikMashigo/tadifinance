import { useState, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, ChevronRight, Mail, Phone, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { ClientTypeBadge } from '../../components/ui/Badge'
import { ClientForm } from './ClientForm'
import { useClients } from '../../hooks/useClients'
import type { ClientType } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const TYPE_FILTERS: { label: string; value: ClientType | 'all' }[] = [
  { label: 'All',          value: 'all'          },
  { label: 'Retail',       value: 'retail'       },
  { label: 'Stylist',      value: 'stylist'      },
  { label: 'Custom',       value: 'custom'       },
  { label: 'Made to Order', value: 'made_to_order' },
]

export function ClientsPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const { clients, loading, error, addClient, removeClient } = useClients()

  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      const matchesType = typeFilter === 'all' || c.client_type === typeFilter
      return matchesSearch && matchesType
    })
  }, [clients, search, typeFilter])

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (confirm(`Delete ${name}? This cannot be undone.`)) removeClient(id)
  }

  return (
    <div className="page">
      <Header
        title="Clients"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            New client
          </button>
        }
      />

      <div className="page__content">
        <div className="clients-hero" />

        <div className="toolbar">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              className="search-box__input"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-pill ${typeFilter === f.value ? 'filter-pill--active' : ''}`}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="state-msg">Loading clients…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>
              {search || typeFilter !== 'all'
                ? 'No clients match your search.'
                : 'No clients yet. Add your first client to get started.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="client-list">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="client-row"
                onClick={() => navigate(`/clients/${client.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/clients/${client.id}`)}
              >
                <div className="client-row__avatar">
                  {client.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="client-row__body">
                  <div className="client-row__name">{client.full_name}</div>
                  <div className="client-row__meta">
                    {client.email && (
                      <span className="client-row__meta-item">
                        <Mail size={12} />
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="client-row__meta-item">
                        <Phone size={12} />
                        {client.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="client-row__right">
                  <ClientTypeBadge type={client.client_type} />
                  <button
                    className="row-delete-btn"
                    aria-label={`Delete ${client.full_name}`}
                    onClick={(e) => handleDelete(e, client.id, client.full_name)}
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={16} className="client-row__chevron" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <p className="list-count">
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
            {typeFilter !== 'all' || search ? ' shown' : ' total'}
          </p>
        )}
      </div>

      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addClient}
      />
    </div>
  )
}
