-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  stage TEXT NOT NULL DEFAULT 'NEW', -- NEW | CONTACTED | DEMO | NEGOTIATION | WON | LOST
  assigned_agent TEXT,
  revenue_potential NUMERIC DEFAULT 0,
  next_followup DATE,
  last_contact TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- call | demo | message | proposal | note | follow_up | missed
  description TEXT NOT NULL,
  agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_leads_stage ON sales_leads(stage);
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead_id ON sales_activities(lead_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sales_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_activities;
