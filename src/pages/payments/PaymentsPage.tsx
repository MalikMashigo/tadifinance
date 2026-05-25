import { useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface OutletCtx { openSidebar: () => void }

export function PaymentsPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()

  return (
    <div className="page">
      <Header
        title="Payments"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary">
            <Plus size={16} />
            Record payment
          </button>
        }
      />
      <div className="page__content">
        <div className="empty-state">
          <p>No payments recorded. Payments will appear here once you mark an invoice as paid.</p>
        </div>
      </div>
    </div>
  )
}
