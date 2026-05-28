import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { IntroScreen } from './pages/intro/IntroScreen'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ClientsPage } from './pages/clients/ClientsPage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { OrderDetailPage } from './pages/orders/OrderDetailPage'
import { QuotesPage } from './pages/quotes/QuotesPage'
import { QuoteDetailPage } from './pages/quotes/QuoteDetailPage'
import { InvoicesPage } from './pages/invoices/InvoicesPage'
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { ReportsPage } from './pages/reports/ReportsPage'

export default function App() {
  useEffect(() => {
    const loader = document.getElementById('app-loader')
    if (!loader) return
    loader.classList.add('fade-out')
    const t = setTimeout(() => loader.remove(), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IntroScreen />} />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="quotes/:id" element={<QuoteDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
