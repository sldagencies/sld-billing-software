
-- ═══════════════════════════════════════════
-- ADDITIONAL TABLES — Shop Billing, Quotations, Motors
-- ═══════════════════════════════════════════

-- Shop bills (billing to other shops — no bill number, credit mostly)
CREATE TABLE IF NOT EXISTS shop_bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    shop_name VARCHAR(200) NOT NULL,
    shop_phone VARCHAR(15),
    shop_address TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'credit',
    notes TEXT,
    created_by VARCHAR(50),
    is_pinned BOOLEAN DEFAULT true
);

-- Quotations (not a real bill — just a price estimate for customer)
CREATE TABLE IF NOT EXISTS quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(15),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_enabled BOOLEAN DEFAULT false,
    gst_rate DECIMAL(5,2) DEFAULT 18.0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    created_by VARCHAR(50)
);

-- Motors registry (for CRI 2-year warranty registration)
CREATE TABLE IF NOT EXISTS motors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id),
    bill_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(15),
    motor_name VARCHAR(300) NOT NULL,
    serial_number VARCHAR(100),
    price DECIMAL(12,2),
    billing_date TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.shop_bills TO anon;
GRANT ALL ON public.shop_bills TO authenticated;
GRANT ALL ON public.quotations TO anon;
GRANT ALL ON public.quotations TO authenticated;
GRANT ALL ON public.motors TO anon;
GRANT ALL ON public.motors TO authenticated;

CREATE INDEX IF NOT EXISTS idx_shop_bills_pinned ON shop_bills(is_pinned);
CREATE INDEX IF NOT EXISTS idx_motors_bill_id ON motors(bill_id);
CREATE INDEX IF NOT EXISTS idx_motors_serial ON motors(serial_number);
