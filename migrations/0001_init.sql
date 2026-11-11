CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT, last_name TEXT, phone TEXT, whatsapp TEXT, country TEXT,
  interest TEXT, platform TEXT, content_type TEXT, starting TEXT, brief TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  ack_sent INTEGER NOT NULL DEFAULT 0,
  notify_sent INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT, cf_country TEXT, user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_email_created ON leads (email, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_ip_created ON leads (ip_hash, created_at);
