-- Support Logs Table
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT,
  user_email TEXT,
  school_name TEXT,
  school_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  browser_info TEXT,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Allow the system to insert
CREATE POLICY "Allow system insert" ON support_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow system select" ON support_requests FOR SELECT USING (true);
