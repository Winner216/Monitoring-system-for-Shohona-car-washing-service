/*
# Expand item types and relax quantity constraint

1. Modified Constraints
- `order_items_type_check`: allow adeyol, mebel, parda in addition to gilam, korpa, korpacha
- `order_items_quantity_check`: allow quantity >= 0 (was > 0) so partial typing
  of numbers in the form doesn't block saving

2. Security
- No new tables or policies. Existing RLS still covers all operations.

3. Notes
- Existing rows are unaffected: their types/quantities already satisfy the new,
  looser constraints.
*/

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_type_check
  CHECK (type = ANY (ARRAY['gilam', 'korpa', 'korpacha', 'adeyol', 'mebel', 'parda']));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check
  CHECK (quantity >= 0);
