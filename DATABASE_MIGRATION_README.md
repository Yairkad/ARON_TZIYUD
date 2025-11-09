# Database Migration Guide - Equipment Request System

## Overview
This migration adds the request-based equipment borrowing system with token authentication, activity logging, and enhanced city management.

## Migration Steps

### 1. Run the SQL Migration

1. Open your Supabase dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to the **SQL Editor** (in the left sidebar)
4. Click **New query**
5. Copy the entire contents of `supabase-migrations.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

### 2. Verify Migration Success

After running the migration, verify that the following tables and columns exist:

#### New Tables Created:
- `equipment_requests` - Stores equipment borrow requests
- `request_items` - Junction table for multiple items per request
- `activity_log` - Audit trail of manager actions

#### Modified Tables:
- `cities` - Added columns:
  - `request_mode` (VARCHAR) - 'direct' or 'request'
  - `cabinet_code` (VARCHAR) - Optional cabinet unlock code
  - `require_call_id` (BOOLEAN) - Whether call ID is mandatory
  - `admin_emails` (TEXT[]) - Array of admin email addresses

- `borrow_history` - Added column:
  - `equipment_status` (VARCHAR) - 'working' or 'faulty'

### 3. Verify RLS Policies

Check that Row Level Security is enabled on:
- equipment_requests
- request_items
- activity_log

### 4. Test Functions

Verify these database functions exist:
- `update_updated_at_column()` - Auto-updates updated_at timestamps
- `expire_old_tokens()` - Marks expired pending requests

### 5. Update Existing Cities (Optional)

If you have existing cities in the database, you may want to set their default request_mode:

```sql
-- Set all existing cities to 'direct' mode (default)
UPDATE cities SET request_mode = 'direct' WHERE request_mode IS NULL;
```

## Data Model

### equipment_requests Table Structure
```
id                UUID (PK)
city_id           UUID (FK → cities)
requester_name    VARCHAR(100)
requester_phone   VARCHAR(20)
call_id           VARCHAR(50) - Optional
token_hash        VARCHAR(255) - SHA-256 hash
status            VARCHAR(20) - pending/approved/rejected/cancelled/expired
expires_at        TIMESTAMPTZ
approved_by       VARCHAR(100)
approved_at       TIMESTAMPTZ
rejected_reason   TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### request_items Table Structure
```
id              UUID (PK)
request_id      UUID (FK → equipment_requests)
equipment_id    UUID (FK → equipment)
quantity        INT
created_at      TIMESTAMPTZ
```

### activity_log Table Structure
```
id            UUID (PK)
city_id       UUID (FK → cities)
manager_name  VARCHAR(100)
action        VARCHAR(50)
details       JSONB
ip_address    VARCHAR(45)
created_at    TIMESTAMPTZ
```

## Common Actions

### Enable Request Mode for a City
```sql
UPDATE cities
SET request_mode = 'request',
    cabinet_code = '1234',  -- Optional
    require_call_id = true  -- Optional
WHERE id = 'YOUR_CITY_ID';
```

### Clean Up Expired Tokens Manually
```sql
SELECT expire_old_tokens();
```

### View All Pending Requests
```sql
SELECT
  er.*,
  c.name as city_name
FROM equipment_requests er
JOIN cities c ON c.id = er.city_id
WHERE er.status = 'pending'
ORDER BY er.created_at DESC;
```

### View Request with Items
```sql
SELECT
  er.*,
  json_agg(
    json_build_object(
      'equipment_name', e.name,
      'quantity', ri.quantity,
      'is_consumable', e.is_consumable
    )
  ) as items
FROM equipment_requests er
JOIN request_items ri ON ri.request_id = er.id
JOIN equipment e ON e.id = ri.equipment_id
WHERE er.id = 'YOUR_REQUEST_ID'
GROUP BY er.id;
```

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS request_items CASCADE;
DROP TABLE IF EXISTS equipment_requests CASCADE;

-- Remove added columns from cities
ALTER TABLE cities
  DROP COLUMN IF EXISTS request_mode,
  DROP COLUMN IF EXISTS cabinet_code,
  DROP COLUMN IF EXISTS require_call_id,
  DROP COLUMN IF EXISTS admin_emails;

-- Remove added column from borrow_history
ALTER TABLE borrow_history
  DROP COLUMN IF EXISTS equipment_status;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS expire_old_tokens() CASCADE;
```

## Notes

- The migration is idempotent (safe to run multiple times)
- Existing data will not be affected
- Default `request_mode` for new cities is 'direct'
- Tokens automatically expire after 30 minutes
- All new tables have RLS enabled for security
- Activity logs are automatically timestamped
