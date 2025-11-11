-- עדכון קואורדינטות מדויקות לכל 3 הערים הנותרות (מהמשתמש)

-- 1. נתיבות - קואורדינטות מדויקות
UPDATE cities
SET
  lat = 31.42557227985329,
  lng = 34.599083320259986,
  token_lat = 31.42557227985329,
  token_lng = 34.599083320259986
WHERE name LIKE '%נתיבות%';

-- 2. אלעד - בעלי התוספות - קואורדינטות מדויקות
UPDATE cities
SET
  lat = 32.048276171792764,
  lng = 34.95784191534255,
  token_lat = 32.048276171792764,
  token_lng = 34.95784191534255
WHERE name LIKE '%אלעד%';

-- 3. צפת - בית המתנדב - קואורדינטות מדויקות
UPDATE cities
SET
  lat = 32.96529013248016,
  lng = 35.495935293433305,
  token_lat = 32.96529013248016,
  token_lng = 35.495935293433305
WHERE name LIKE '%צפת%';

-- ✅ בדיקה סופית - כל הערים צריכות להיות עם קואורדינטות
SELECT
  name,
  CASE
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN '✅ יש קואורדינטות'
    ELSE '❌ חסר'
  END as status,
  ROUND(CAST(lat AS numeric), 6) as lat,
  ROUND(CAST(lng AS numeric), 6) as lng,
  ROUND(CAST(token_lat AS numeric), 6) as token_lat,
  ROUND(CAST(token_lng AS numeric), 6) as token_lng
FROM cities
ORDER BY name;

-- 📊 סיכום: כמה ערים עם קואורדינטות
SELECT
  COUNT(*) as total_cities,
  COUNT(lat) as cities_with_coords,
  COUNT(*) - COUNT(lat) as cities_missing_coords
FROM cities;
