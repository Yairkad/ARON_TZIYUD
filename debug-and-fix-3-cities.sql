-- בדיקה: איזה שם מדויק יש לאלעד?
SELECT id, name, length(name), ascii(substring(name from 1 for 1))
FROM cities
WHERE name LIKE '%אלעד%';

-- אם השם שונה קצת (רווחים או תווים מיוחדים), נעדכן לפי ID או pattern
-- עדכון אלעד לפי pattern במקום שם מדויק
UPDATE cities
SET
  lat = 32.048308,
  lng = 34.957799,
  token_lat = 32.048308,
  token_lng = 34.957799
WHERE name LIKE 'אלעד%';

-- עדכון נתיבות - צריך קואורדינטות מדויקות
-- בואו נחלץ מה-token_location_url שלהם
-- נפתח את הקישור הקצר ידנית או נשתמש בקואורדינטות כלליות
UPDATE cities
SET
  lat = 31.420792,
  lng = 34.591386,
  token_lat = 31.420792,
  token_lng = 34.591386
WHERE name = 'נתיבות';

-- עדכון צפת - בית המתנדב
-- קואורדינטות של בית המתנדב בצפת
UPDATE cities
SET
  lat = 32.965556,
  lng = 35.495556,
  token_lat = 32.965556,
  token_lng = 35.495556
WHERE name LIKE 'צפת%';

-- בדיקה סופית
SELECT
  name,
  CASE WHEN lat IS NOT NULL THEN '✅' ELSE '❌' END || ' ' ||
  COALESCE(ROUND(CAST(lat AS numeric), 6)::text, 'NULL') as lat,
  COALESCE(ROUND(CAST(lng AS numeric), 6)::text, 'NULL') as lng,
  CASE WHEN token_lat IS NOT NULL THEN '✅' ELSE '❌' END || ' ' ||
  COALESCE(ROUND(CAST(token_lat AS numeric), 6)::text, 'NULL') as token_lat,
  COALESCE(ROUND(CAST(token_lng AS numeric), 6)::text, 'NULL') as token_lng
FROM cities
ORDER BY name;
