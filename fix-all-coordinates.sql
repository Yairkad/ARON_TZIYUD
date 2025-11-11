-- עדכון קואורדינטות מדויקות לכל הערים
-- חולץ מה-URLs הארוכים ב-token_location_url וממידע ידני

-- 1. בית שמש - נחל לכיש 1 (מדויק מהמשתמש)
UPDATE cities
SET
  lat = 31.715082105152554,
  lng = 34.993855027441114,
  token_lat = 31.715082105152554,
  token_lng = 34.993855027441114
WHERE name = 'בית שמש - נחל לכיש 1';

-- 2. אלעד - בעלי התוספות
-- מתוך: https://www.google.com/maps/place/32°02'53.9"N+34°57'28.1"E/@32.048308,34.957799
UPDATE cities
SET
  token_lat = 32.048308,
  token_lng = 34.957799
WHERE name = 'אלעד - בעלי התוספות';

-- 3. גוש עציון - שמורת עוז וגאון
-- מתוך: google.co.il/maps/place/31°38'31.3"N+35°08'02.6"E/@31.6420245,35.1366159
-- או מהפורמט: !3d31.64202!4d35.134041
UPDATE cities
SET
  token_lat = 31.64202,
  token_lng = 35.134041
WHERE name = 'גוש עציון - שמורת עוז וגאון';

-- 4. ירושלים - העיר העתיקה
-- מתוך: /@31.7738961,35.2316462 או !3d31.7738495!4d35.2315503
UPDATE cities
SET
  token_lat = 31.7738495,
  token_lng = 35.2315503
WHERE name = 'ירושלים - העיר העתיקה';

-- 5. נווה דניאל - המוריה
-- מתוך: /@31.6767934,35.1415911 או !3d31.676801!4d35.141438
UPDATE cities
SET
  token_lat = 31.676801,
  token_lng = 35.141438
WHERE name = 'נווה דניאל - המוריה';

-- 6. קיבוץ מגדל עוז
-- מתוך: https://www.google.com/maps/place/31°38'29.1"N+35°08'33.0"E/@31.6414235,35.1450709
-- או מהפורמט: !3d31.641419!4d35.142496
UPDATE cities
SET
  token_lat = 31.641419,
  token_lng = 35.142496
WHERE name = 'קיבוץ מגדל עוז';

-- 7. קרית ארבע - מתחת בנין המועצה
-- מתוך: /@31.5294874,35.2015545 או !3d31.5293675!4d35.1191527
UPDATE cities
SET
  token_lat = 31.5293675,
  token_lng = 35.1191527
WHERE name = 'קרית ארבע - מתחת בנין המועצה';

-- כעת נעתיק את הקואורדינטות מ-token ל-location_url
-- רק עבור ערים שאין להן location_url או שיש location_url אבל אין קואורדינטות
UPDATE cities
SET lat = token_lat, lng = token_lng
WHERE token_lat IS NOT NULL
  AND token_lng IS NOT NULL
  AND (lat IS NULL OR lng IS NULL);

-- בדיקה: הצג את כל הקואורדינטות
SELECT
  name,
  ROUND(CAST(lat AS numeric), 6) as lat,
  ROUND(CAST(lng AS numeric), 6) as lng,
  ROUND(CAST(token_lat AS numeric), 6) as token_lat,
  ROUND(CAST(token_lng AS numeric), 6) as token_lng,
  CASE
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN '✅ דף ראשי'
    ELSE '❌ חסר'
  END as status_main,
  CASE
    WHEN token_lat IS NOT NULL AND token_lng IS NOT NULL THEN '✅ טוקן'
    ELSE '❌ חסר'
  END as status_token
FROM cities
ORDER BY name;
