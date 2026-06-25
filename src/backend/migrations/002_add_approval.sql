-- Run this migration after 001_create_purchase_orders.sql
-- Adds approval tracking columns and the approvers whitelist table

ALTER TABLE orden_compra
  ADD COLUMN IF NOT EXISTS approved_by      TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ;

-- Stores which users are allowed to approve purchase orders.
-- Only admins can insert/delete rows here.
CREATE TABLE IF NOT EXISTS purchase_order_approvers (
  user_id     TEXT        PRIMARY KEY,
  user_name   TEXT        NOT NULL,
  granted_by  TEXT        NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
