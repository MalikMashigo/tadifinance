-- Run this in Supabase SQL Editor after migration.sql
-- Adds RPC functions the app calls to generate unique order/invoice numbers.

create or replace function generate_order_number()
returns text language sql security definer as $$
  select 'TWN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_seq')::text, 3, '0');
$$;

create or replace function generate_invoice_number()
returns text language sql security definer as $$
  select 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 3, '0');
$$;
