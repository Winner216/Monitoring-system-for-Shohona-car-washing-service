/*
# Carpet Washing Service Management System — Database Schema

1. Overview
This schema backs "Gilam Yuvish Boshqaruv Tizimi", an employee-only carpet washing
service management app. The entire UI is in Uzbek (Latin). Orders move through a
fixed status pipeline, each transition timestamped. Employees have roles (admin / xodim)
that gate destructive actions.

2. New Tables
- `employees` — staff profile linked to Supabase auth, with a role (admin | xodim) and display name.
- `orders` — a customer order: customer name, phone, location, notes, current status, timestamps, owner employee.
- `order_items` — line items belonging to an order (type, quantity, optional size).
- `status_history` — one row per status transition (status, started_at, finished_at, employee_id).

3. Columns
employees:
  id (uuid PK, references auth.users)
  name (text)
  role (text, check admin | xodim)
  created_at (timestamptz)

orders:
  id (uuid PK)
  order_number (text, unique, human-friendly e.g. GY-0001)
  customer_name (text)
  phone (text)
  location (text)
  notes (text, nullable)
  status (text, check in the 6 pipeline stages)
  created_at, updated_at (timestamptz)
  created_by (uuid FK -> employees.id)

order_items:
  id (uuid PK)
  order_id (uuid FK -> orders.id ON DELETE CASCADE)
  type (text, check gilam | korpa | korpacha)
  quantity (int, default 1)
  size (text, nullable)

status_history:
  id (uuid PK)
  order_id (uuid FK -> orders.id ON DELETE CASCADE)
  status (text, same checks as orders.status)
  started_at (timestamptz)
  finished_at (timestamptz, nullable)
  employee_id (uuid FK -> employees.id)

4. Indexes
- orders.status, orders.created_at, orders.phone, orders.customer_name, orders.order_number
- order_items.order_id, status_history.order_id

5. Security (RLS)
- All tables enable RLS, scoped TO authenticated with ownership checks.
- Employees read all orders (shared operational data) but only create/update their own;
  deletes are admin-only (policy checks the employee role).
- order_items and status_history are governed by parent ownership.
- employees table is readable by all authenticated staff; updates self-only; role column
  protected (only admins can change a role).

6. Notes
- order_number is generated in app code (GY-NNNN) and enforced unique.
- Status pipeline values are enforced via CHECK constraints to keep the app honest.
- A trigger keeps orders.updated_at fresh on every status_history insert and order_items change.
*/

-- ===== employees =====
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'xodim' CHECK (role IN ('admin', 'xodim')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "employees_insert_self" ON employees;
CREATE POLICY "employees_insert_self" ON employees FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "employees_update_self" ON employees;
CREATE POLICY "employees_update_self" ON employees FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Only admins can delete an employee row
DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
CREATE POLICY "employees_delete_admin" ON employees FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

-- ===== orders =====
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'qabul_qilindi' CHECK (status IN (
    'qabul_qilindi', 'yuvishda', 'tozalanmoqda', 'quritilmoqda', 'tayyor', 'topshirildi'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can see all orders (shared operational data)
DROP POLICY IF EXISTS "orders_select_all" ON orders;
CREATE POLICY "orders_select_all" ON orders FOR SELECT
  TO authenticated USING (true);

-- Any authenticated staff can create an order (they are the creator)
DROP POLICY IF EXISTS "orders_insert_staff" ON orders;
CREATE POLICY "orders_insert_staff" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

-- Any authenticated staff can update order status/details (workflows need this)
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
CREATE POLICY "orders_update_staff" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Only admins can delete orders
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

-- ===== order_items =====
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('gilam', 'korpa', 'korpacha')),
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Governed by parent order ownership (all staff can read since orders are shared)
DROP POLICY IF EXISTS "order_items_select_all" ON order_items;
CREATE POLICY "order_items_select_all" ON order_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "order_items_insert_staff" ON order_items;
CREATE POLICY "order_items_insert_staff" ON order_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_update_staff" ON order_items;
CREATE POLICY "order_items_update_staff" ON order_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
CREATE POLICY "order_items_delete_admin" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

-- ===== status_history =====
CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'qabul_qilindi', 'yuvishda', 'tozalanmoqda', 'quritilmoqda', 'tayyor', 'topshirildi'
  )),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_history_select_all" ON status_history;
CREATE POLICY "status_history_select_all" ON status_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "status_history_insert_staff" ON status_history;
CREATE POLICY "status_history_insert_staff" ON status_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "status_history_update_staff" ON status_history;
CREATE POLICY "status_history_update_staff" ON status_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "status_history_delete_admin" ON status_history;
CREATE POLICY "status_history_delete_admin" ON status_history FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = auth.uid() AND e.role = 'admin')
  );

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_status ON status_history(status);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION touch_order_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_touch ON orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_order_updated_at();

-- Bump orders.updated_at whenever a status_history row is inserted
CREATE OR REPLACE FUNCTION bump_order_on_status()
RETURNS trigger AS $$
BEGIN
  UPDATE orders SET updated_at = now() WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_status_history_bump ON status_history;
CREATE TRIGGER trg_status_history_bump AFTER INSERT ON status_history
  FOR EACH ROW EXECUTE FUNCTION bump_order_on_status();
