-- Global System Settings for Kill Switch and Maintenance
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed initial maintenance mode (Off)
INSERT INTO system_settings (id, value) 
VALUES ('maintenance_mode', '{"enabled": false, "message": "System is under scheduled maintenance"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Detailed System Logs for the "Active Issues" card
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL, -- 'ERROR', 'WARN', 'INFO'
  module TEXT NOT NULL, -- 'AUTH', 'FEES', 'RESULTS', 'INFRA'
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable Realtime for status monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;
