-- Migration: 001_create_purchase_orders
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/001_create_purchase_orders.sql

CREATE TABLE IF NOT EXISTS orden_compra (
   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   proveedor_id    UUID NOT NULL REFERENCES proveedor(id),
   fecha           DATE NOT NULL,
   estado          VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
                      CHECK (estado IN ('BORRADOR', 'PENDIENTE', 'APROBADA', 'RECIBIDA', 'CANCELADA')),
   notas           TEXT,
   total           NUMERIC(14, 2) NOT NULL DEFAULT 0,
   created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orden_compra_item (
   id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   orden_compra_id   UUID NOT NULL REFERENCES orden_compra(id) ON DELETE CASCADE,
   descripcion       TEXT NOT NULL,
   cantidad          NUMERIC(12, 4) NOT NULL,
   precio_unitario   NUMERIC(14, 2) NOT NULL,
   subtotal          NUMERIC(14, 2) NOT NULL,
   created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orden_compra_proveedor_id ON orden_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_orden_compra_estado        ON orden_compra(estado);
CREATE INDEX IF NOT EXISTS idx_orden_compra_item_orden_id ON orden_compra_item(orden_compra_id);
