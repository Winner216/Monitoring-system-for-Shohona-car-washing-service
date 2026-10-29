/*
# Add income tracking to orders

1. Modified Tables
- `orders`: add `price` (numeric, nullable — total amount charged to the customer),
  `paid` (boolean, default false — whether payment was received),
  `paid_at` (timestamptz, nullable — when the payment was recorded).

2. Security
- No new tables. Existing RLS policies on `orders` already allow authenticated
  staff to insert/update, so the new columns are covered. No policy changes needed.

3. Notes
- `price` is nullable so existing orders created before this migration are not broken.
- `paid` defaults to false. When an employee marks an order as "Topshirildi" and
  records payment, `paid` is set to true and `paid_at` is stamped.
- Income reports filter on `paid = true` and sum `price`.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS price numeric(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(paid);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
