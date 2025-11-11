-- עדכון קואורדינטות מדויקות לנתיבות ואלעד (מהמשתמש)

-- נתיבות - קואורדינטות מדויקות
UPDATE cities
SET
  lat = 31.42557227985329,
  lng = 34.599083320259986,
  token_lat = 31.42557227985329,
  token_lng = 34.599083320259986
WHERE name LIKE '%נתיבות%';

-- אלעד - קואורדינטות מדויקות
UPDATE cities
SET
  lat = 32.048276171792764,
  lng = 34.95784191534255,
  token_lat = 32.048276171792764,
  token_lng = 34.95784191534255
WHERE name LIKE '%אלעד%';

-- בדיקה סופית - כל הערים
SELECT
  name,
  CASE WHEN lat IS NOT NULL THEN '✅' ELSE '❌' END as status,
  ROUND(CAST(lat AS numeric), 6) as lat,
  ROUND(CAST(lng AS numeric), 6) as lng
FROM cities
ORDER BY name;
