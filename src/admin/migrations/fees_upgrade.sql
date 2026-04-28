-- Migration: Upgrade Fees Table
ALTER TABLE fees ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'CASH'; -- e.g. MPESA, BANK, CASH
ALTER TABLE fees ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS reference_no TEXT; -- Mpesa code or Bank Ref

-- Update logic if status is pending
-- Statuses: 'UNPAID', 'PARTIAL', 'PAID', 'HELD', 'DENIED', 'PENDING_APPROVAL' 
