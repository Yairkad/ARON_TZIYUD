# Equipment Priority Calculation System

## Overview
This system automatically calculates equipment `display_order` (priority) based on actual borrow history per city.

## How it works

### Priority Logic
- **Lower `display_order` = Higher Priority** (appears first)
- Priority is calculated **per city** based on borrow frequency
- Most borrowed items in each city get the lowest numbers (1, 2, 3...)
- Never borrowed items get `display_order = 999`

### Time Window
- Calculates based on **last 6 months** of borrow history
- Older data is not included to keep priorities relevant

## Setup Instructions

### 1. Initial Setup - Run SQL Script

Run this in Supabase SQL Editor:
```bash
File: calculate-display-order-from-usage.sql
```

This will:
1. Add `display_order` column to equipment table
2. Calculate initial priorities based on existing borrow history
3. Create the `recalculate_equipment_priority()` function
4. Create necessary indexes for performance

### 2. Verify Results

After running the script, check the results:
```sql
SELECT
  c.name as city_name,
  e.name as equipment_name,
  e.display_order,
  COUNT(bh.id) as total_borrows
FROM equipment e
JOIN cities c ON e.city_id = c.id
LEFT JOIN borrow_history bh ON e.id = bh.equipment_id
WHERE e.display_order <= 20
GROUP BY c.name, e.name, e.display_order
ORDER BY c.name, e.display_order;
```

## Recalculation Options

### Option 1: Manual Recalculation (Supabase)
Run this in Supabase SQL Editor whenever you want to update priorities:
```sql
SELECT recalculate_equipment_priority();
```

### Option 2: API Endpoint (Recommended for Automation)
Call this API endpoint:
```bash
POST /api/recalculate-priority
```

**Using curl:**
```bash
curl -X POST https://your-domain.vercel.app/api/recalculate-priority
```

### Option 3: Automated Daily Recalculation

#### Using Vercel Cron Jobs (Recommended)
1. Create `vercel.json` in project root:
```json
{
  "crons": [{
    "path": "/api/recalculate-priority",
    "schedule": "0 2 * * *"
  }]
}
```
This runs daily at 2 AM UTC.

#### Using External Cron Service
Use services like:
- **EasyCron** (https://easycron.com)
- **cron-job.org** (https://cron-job.org)
- **GitHub Actions**

Example GitHub Action (`.github/workflows/recalculate-priority.yml`):
```yaml
name: Recalculate Equipment Priority
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  recalculate:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X POST https://your-domain.vercel.app/api/recalculate-priority
```

## Examples

### Example 1: City with Many Jack Requests
```
City: תל אביב
Borrow History:
- ג'ק מספריים: 50 times
- מפתח צלב: 35 times
- קומפרסור: 20 times
- ספריי פנצ'ר: 15 times

Result:
- ג'ק מספריים: display_order = 1
- מפתח צלב: display_order = 2
- קומפרסור: display_order = 3
- ספריי פנצ'ר: display_order = 4
```

### Example 2: Different Priorities Per City
```
תל אביב:
1. ג'ק מספריים
2. מפתח צלב
3. קומפרסור

ירושלים:
1. קומפרסור
2. כבלים
3. ג'ק מספריים

Each city has its own priorities based on its usage!
```

## Monitoring

### Check Last Recalculation
```sql
SELECT
  city_id,
  COUNT(*) as total_equipment,
  COUNT(CASE WHEN display_order < 999 THEN 1 END) as prioritized_items,
  MIN(display_order) as highest_priority,
  MAX(display_order) as lowest_priority
FROM equipment
GROUP BY city_id;
```

### View Top Priority Items
```sql
SELECT
  c.name as city,
  e.name,
  e.display_order,
  e.quantity
FROM equipment e
JOIN cities c ON e.city_id = c.id
WHERE e.display_order <= 10
ORDER BY c.name, e.display_order;
```

## Troubleshooting

### Issue: All items still have display_order = 999
**Solution:** No borrow history in the last 6 months. Either:
1. Change the time window in SQL to longer period
2. Wait for more borrows to accumulate
3. Set manual priorities for new cities

### Issue: Priorities not updating
**Solution:**
1. Check if the function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'recalculate_equipment_priority';`
2. Manually run: `SELECT recalculate_equipment_priority();`
3. Check API logs for errors

## Performance

- **Indexes created**: Queries are optimized with proper indexes
- **Time complexity**: O(n log n) per city, where n = number of equipment items
- **Recommended frequency**: Daily recalculation is sufficient
- **No impact**: Recalculation happens in background, users not affected

## Future Enhancements

1. **Weighted by recency**: Give more weight to recent borrows
2. **Seasonal adjustment**: Account for seasonal patterns
3. **Manual override**: Allow managers to boost specific items
4. **ML prediction**: Predict future popular items based on trends
