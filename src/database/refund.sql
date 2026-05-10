-- Migration: Add refund tracking columns to payments table
-- This migration adds refund reason and processed timestamp for better refund tracking

ALTER TABLE payments ADD COLUMN refund_reason VARCHAR(255);
ALTER TABLE payments ADD COLUMN refund_processed_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient webhook processing
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
