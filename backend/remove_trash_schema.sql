-- Drop trash tables
DROP TABLE IF EXISTS trash_logs;
DROP TABLE IF EXISTS payment_trash;
DROP TABLE IF EXISTS supplier_payment_trash;
DROP TABLE IF EXISTS quotation_trash;
DROP TABLE IF EXISTS supplier_trash;
DROP TABLE IF EXISTS lead_trash;
DROP TABLE IF EXISTS lead_follow_up_trash;
DROP TABLE IF EXISTS lead_interaction_trash;
DROP TABLE IF EXISTS notification_trash;
DROP TABLE IF EXISTS bank_account_trash;
DROP TABLE IF EXISTS team_member_trash;

-- Drop columns from main tables
ALTER TABLE payments DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE quotations DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE suppliers DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE leads DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE lead_follow_ups DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE lead_interactions DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE notifications DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE bank_accounts DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE team_members DROP COLUMN IF EXISTS deleted, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;

-- Tables that likely only used 'deleted' flag without full trash tracking
ALTER TABLE supplier_payments DROP COLUMN IF EXISTS deleted;
ALTER TABLE team_payments DROP COLUMN IF EXISTS deleted;
ALTER TABLE team_work_entries DROP COLUMN IF EXISTS deleted;
ALTER TABLE expenses DROP COLUMN IF EXISTS deleted;
