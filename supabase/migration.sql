-- TADI wa NASHE Finance System — Supabase migration
-- Run this in: Supabase Dashboard > SQL Editor > New query > Run
-- All monetary values in ZAR. All IDs are UUID.

-- ─── Enable UUID extension ─────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── clients ──────────────────────────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text,
  phone         text,
  address       text,
  city          text,
  country       text not null default 'South Africa',
  client_type   text not null default 'retail'
                  check (client_type in ('retail','stylist','media','wholesale')),
  notes         text,
  style_preferences text,
  created_at    timestamptz not null default now()
);

-- ─── measurements ─────────────────────────────────────────────────────────
create table if not exists measurements (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  bust            numeric(6,2),
  waist           numeric(6,2),
  hips            numeric(6,2),
  shoulder_width  numeric(6,2),
  sleeve_length   numeric(6,2),
  torso_length    numeric(6,2),
  inseam          numeric(6,2),
  notes           text,
  measured_at     timestamptz not null default now()
);

-- ─── orders ───────────────────────────────────────────────────────────────
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete restrict,
  order_number    text not null unique,
  order_type      text not null default 'bespoke'
                    check (order_type in ('bespoke','collection','alteration')),
  status          text not null default 'consult'
                    check (status in ('consult','pattern','cutting','sewing','fitting','complete','delivered')),
  collection_name text,
  description     text,
  due_date        date,
  delivery_date   date,
  total_amount    numeric(12,2) not null default 0,
  deposit_amount  numeric(12,2) not null default 0,
  balance_due     numeric(12,2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ─── order_items ──────────────────────────────────────────────────────────
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  garment_name  text not null,
  garment_type  text,
  fabric        text,
  colour        text,
  size          text,
  quantity      int not null default 1,
  unit_price    numeric(12,2) not null default 0,
  line_total    numeric(12,2) not null default 0,
  notes         text
);

-- ─── invoices ─────────────────────────────────────────────────────────────
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete restrict,
  order_id        uuid references orders(id) on delete set null,
  invoice_number  text not null unique,
  status          text not null default 'draft'
                    check (status in ('draft','sent','partially_paid','paid','overdue')),
  issue_date      date not null default current_date,
  due_date        date not null,
  subtotal        numeric(12,2) not null default 0,
  vat_amount      numeric(12,2) not null default 0,
  total_amount    numeric(12,2) not null default 0,
  amount_paid     numeric(12,2) not null default 0,
  balance_due     numeric(12,2) not null default 0,
  notes           text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── payments ─────────────────────────────────────────────────────────────
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  amount          numeric(12,2) not null,
  payment_method  text not null default 'EFT'
                    check (payment_method in ('EFT','cash','card','PayShap')),
  reference       text,
  payment_date    date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ─── expenses ─────────────────────────────────────────────────────────────
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete set null,
  category      text not null
                  check (category in ('fabric','trims','labour','packaging','shipping','show')),
  description   text not null,
  supplier      text,
  amount        numeric(12,2) not null,
  expense_date  date not null default current_date,
  receipt_url   text,
  created_at    timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_measurements_client  on measurements(client_id);
create index if not exists idx_orders_client        on orders(client_id);
create index if not exists idx_order_items_order    on order_items(order_id);
create index if not exists idx_invoices_client      on invoices(client_id);
create index if not exists idx_invoices_order       on invoices(order_id);
create index if not exists idx_invoices_status      on invoices(status);
create index if not exists idx_payments_invoice     on payments(invoice_id);
create index if not exists idx_expenses_order       on expenses(order_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────
-- This app uses a single authenticated user (Tadiwanashe).
-- All tables are restricted to the authenticated role.

alter table clients      enable row level security;
alter table measurements enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table invoices     enable row level security;
alter table payments     enable row level security;
alter table expenses     enable row level security;

-- Policy: authenticated user can do everything (single-user system)
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients','measurements','orders','order_items','invoices','payments','expenses'
  ]
  loop
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format(
      'create policy "auth_all" on %I
       for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- ─── Sequence helper: auto-generate order and invoice numbers ─────────────
create sequence if not exists order_seq start 1;
create sequence if not exists invoice_seq start 1;

-- Usage in app:
--   order_number:   'TWN-' || to_char(now(),'YYYY') || '-' || lpad(nextval('order_seq')::text, 3, '0')
--   invoice_number: 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 3, '0')
