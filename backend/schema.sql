-- ═══════════════════════════════════════════════════
-- SLD BILLING SOFTWARE — DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_enabled BOOLEAN DEFAULT false,
    gst_rate DECIMAL(5,2) DEFAULT 18.0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    discount_enabled BOOLEAN DEFAULT false,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    advance_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    return_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'credit',
    payment_method VARCHAR(20) DEFAULT 'cash',
    upi_transaction_id VARCHAR(100),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_by VARCHAR(50),
    is_pinned BOOLEAN DEFAULT true
);

-- Return bills table
CREATE TABLE IF NOT EXISTS return_bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_bill_id UUID REFERENCES bills(id),
    bill_number VARCHAR(20),
    customer_name VARCHAR(200),
    customer_phone VARCHAR(15),
    items JSONB NOT NULL DEFAULT '[]',
    return_amount DECIMAL(12,2) DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    outstanding_credit DECIMAL(12,2) DEFAULT 0,
    bill_count INT DEFAULT 0,
    last_purchase TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit reminders table
CREATE TABLE IF NOT EXISTS credit_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id),
    bill_number VARCHAR(20),
    customer_name VARCHAR(200),
    customer_phone VARCHAR(15),
    amount DECIMAL(12,2),
    reminder_count INT DEFAULT 0,
    last_sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_pinned ON bills(is_pinned);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON credit_reminders(status);

-- ═══════════════════════════════════════════
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard
-- 2. Click SQL Editor (left sidebar)
-- 3. Paste this entire file
-- 4. Click Run
-- 5. All tables will be created ✅
-- ═══════════════════════════════════════════
