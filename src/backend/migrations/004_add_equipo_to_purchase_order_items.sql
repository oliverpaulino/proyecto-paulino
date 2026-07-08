-- Migration: 004_add_equipo_to_purchase_order_items
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/004_add_equipo_to_purchase_order_items.sql

-- Optionally link a purchase-order line item to the equipo it was bought for.
-- ON DELETE SET NULL: deleting an equipo must not delete purchase-order lines;
-- the line survives with equipo_id = NULL.
ALTER TABLE orden_compra_item
   ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orden_compra_item_equipo_id
   ON orden_compra_item(equipo_id);
