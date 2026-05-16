-- Run this command in your Supabase SQL Editor
-- This adds the missing 'disbursed_by' column so the system can track who did the disbursement

ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_by TEXT;
