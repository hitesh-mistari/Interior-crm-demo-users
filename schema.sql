-- Database Schema for Artistics Engineers (PostgreSQL)
-- Generated based on backend codebase analysis

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Core Entities
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password TEXT NOT NULL,
  photo_url TEXT,
  role TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  role_mode TEXT DEFAULT 'default',
  permissions JSONB
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT,
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT,
  action_url TEXT,
  action_text TEXT,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notification_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trash_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  reason TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Teams & Projects
-- ==========================================

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT,
  quotation_number TEXT,
  client_name TEXT,
  client_contact TEXT,
  client_phone TEXT,
  quotation_date TIMESTAMP,
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  include_terms BOOLEAN DEFAULT FALSE,
  include_bank_details BOOLEAN DEFAULT FALSE,
  bank_account_id UUID, -- References bank_accounts (defined later)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id),
  item TEXT,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  rate NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  is_additional BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS quotation_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT NOT NULL,
  client_name TEXT,
  client_contact TEXT,
  project_type TEXT,
  start_date TIMESTAMP,
  deadline TIMESTAMP,
  end_date TIMESTAMP,
  project_amount NUMERIC,
  expected_profit_percentage NUMERIC,
  status TEXT,
  quotation_id UUID REFERENCES quotations(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  assigned_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  contact TEXT,
  age INTEGER,
  skills TEXT[], 
  specialties TEXT[],
  employment_status TEXT,
  rate_type TEXT,
  rate_amount NUMERIC DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_work_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID REFERENCES team_members(id),
  project_id UUID REFERENCES projects(id),
  work_date TIMESTAMP,
  task_name TEXT,
  quantity NUMERIC DEFAULT 1,
  rate NUMERIC,
  amount NUMERIC,
  payment_status TEXT DEFAULT 'Pending',
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID REFERENCES team_members(id),
  amount NUMERIC,
  payment_date TIMESTAMP,
  payment_mode TEXT,
  payment_type TEXT,
  notes TEXT,
  work_entry_ids JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  task TEXT, -- Title
  status TEXT,
  priority TEXT,
  date TIMESTAMP, -- Due Date
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

-- ==========================================
-- Financials & Inventory
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_name TEXT,
  company_name TEXT,
  phone TEXT,
  alternate_phone TEXT,
  address TEXT,
  gst_number TEXT,
  category TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  title TEXT,
  amount NUMERIC,
  expense_date TIMESTAMP,
  payment_mode TEXT,
  payment_status TEXT,
  notes TEXT,
  receipt_images JSONB,
  supplier_id UUID REFERENCES suppliers(id),
  temp_supplier_name TEXT,
  team_member_id UUID REFERENCES team_members(id),
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  edit_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id),
  description TEXT,
  amount NUMERIC
);

CREATE TABLE IF NOT EXISTS expense_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  expense_id UUID REFERENCES expenses(id),
  amount NUMERIC,
  payment_mode TEXT,
  payment_date TIMESTAMP,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_payment_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  amount NUMERIC,
  payment_type TEXT,
  payment_mode TEXT,
  payment_date TIMESTAMP,
  reference_number TEXT,
  notes TEXT,
  added_by UUID REFERENCES users(id),
  edit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_holder_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  branch_name TEXT,
  branch_address TEXT,
  account_type TEXT,
  ifsc_code TEXT,
  upi_id_or_phone TEXT,
  payment_instructions TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_account_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  description TEXT,
  category TEXT,
  unit TEXT,
  unit_price NUMERIC,
  currency TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  min_stock NUMERIC,
  current_stock NUMERIC,
  location TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS material_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  description TEXT,
  category TEXT,
  sku TEXT,
  default_rate NUMERIC,
  unit TEXT,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

-- ==========================================
-- Leads & CRM
-- ==========================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  phone TEXT,
  location TEXT,
  source TEXT,
  status TEXT,
  lead_type TEXT,
  remarks TEXT,
  assigned_to UUID REFERENCES users(id),
  estimated_value NUMERIC,
  instagram_lead_id TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  type TEXT,
  subject TEXT,
  content TEXT,
  interaction_date TIMESTAMP,
  duration NUMERIC,
  outcome TEXT,
  next_action TEXT,
  next_action_date TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_interaction_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  interaction_id UUID REFERENCES lead_interactions(id),
  follow_up_type TEXT,
  subject TEXT,
  notes TEXT,
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  status TEXT,
  priority TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_follow_up_trash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  reason TEXT,
  retention_until TIMESTAMP
);
