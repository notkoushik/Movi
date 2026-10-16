ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_created_by_fkey;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
