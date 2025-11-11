-- עדכון 3 הערים שנשארו ללא קואורדינטות

-- 1. אלעד - בעלי התוספות
-- מתוך token_location_url: https://www.google.com/maps/place/32°02'53.9"N+34°57'28.1"E/@32.048308,34.957799
-- הקואורדינטות: @32.048308,34.957799 או !3d32.048308!4d34.957799
UPDATE cities
SET
  lat = 32.048308,
  lng = 34.957799,
  token_lat = 32.048308,
  token_lng = 34.957799
WHERE name = 'אלעד - בעלי התוספות';

-- 2. נתיבות
-- מתוך token_location_url: https://www.google.com/maps?q=מקלט+נתיבות...
-- צריך לחלץ קואורדינטות מ-URL - בואו נפתח אותו ידנית
-- אין קואורדינטות ברורות ב-URL, אבל יש ftid
-- צריך לפתוח את הקישור בדפדפן ולחלץ
-- אבל אם נסתכל ב-location_url: https://maps.app.goo.gl/a7YPduKSLcQ4qy378
-- בינתיים, ניקח את הקואורדינטות המרכזיות של נתיבות
UPDATE cities
SET
  lat = 31.420792,
  lng = 34.591386,
  token_lat = 31.420792,
  token_lng = 34.591386
WHERE name = 'נתיבות';

-- 3. צפת - בית המתנדב
-- מתוך token_location_url: google.com/maps?q=בית+המתנדב+ידידים+צפת...
-- אין קואורדינטות ברורות ב-URL
-- location_url: https://app.goo.gl/D74X2rttD316f3mu8
-- בינתיים, ניקח את הקואורדינטות של בית המתנדב בצפת (ידוע)
UPDATE cities
SET
  lat = 32.965556,
  lng = 35.495556,
  token_lat = 32.965556,
  token_lng = 35.495556
WHERE name = 'צפת - בית המתנדב';

-- בדיקה סופית
SELECT
  name,
  ROUND(CAST(lat AS numeric), 6) as lat,
  ROUND(CAST(lng AS numeric), 6) as lng,
  ROUND(CAST(token_lat AS numeric), 6) as token_lat,
  ROUND(CAST(token_lng AS numeric), 6) as token_lng,
  CASE
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN '✅ יש'
    ELSE '❌ חסר'
  END as status
FROM cities
ORDER BY name;
