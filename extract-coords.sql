-- עדכון קואורדינטות לאלעד (מתוך token_location_url)
UPDATE cities
SET token_lat = 32.048308, token_lng = 34.957799
WHERE name = 'אלעד - בעלי התוספות';

-- עדכון קואורדינטות לגוש עציון (מתוך token_location_url - פורמט DMS)
-- 31°38'31.3"N = 31 + 38/60 + 31.3/3600 = 31.64202
-- 35°08'02.6"E = 35 + 8/60 + 2.6/3600 = 35.134041
UPDATE cities
SET token_lat = 31.64202, token_lng = 35.134041
WHERE name = 'גוש עציון - שמורת עוז וגאון';

-- עדכון קואורדינטות לירושלים (מתוך token_location_url)
UPDATE cities
SET token_lat = 31.7738495, token_lng = 35.2315503
WHERE name = 'ירושלים - העיר העתיקה';

-- עדכון קואורדינטות לנווה דניאל (מתוך token_location_url)
UPDATE cities
SET token_lat = 31.676801, token_lng = 35.141438
WHERE name = 'נווה דניאל - המוריה';

-- עדכון קואורדינטות לקיבוץ מגדל עוז (מתוך token_location_url - פורמט DMS)
-- 31°38'29.1"N = 31 + 38/60 + 29.1/3600 = 31.641419
-- 35°08'33.0"E = 35 + 8/60 + 33.0/3600 = 35.142496
UPDATE cities
SET token_lat = 31.641419, token_lng = 35.142496
WHERE name = 'קיבוץ מגדל עוז';

-- עדכון קואורדינטות לקרית ארבע (מתוך token_location_url)
UPDATE cities
SET token_lat = 31.5293675, token_lng = 35.1191527
WHERE name = 'קרית ארבע - מתחת בנין המועצה';

-- כעת צריך להתעסק עם הקישורים הקצרים ב-location_url
-- אלה דורשים הרחבה ידנית או דרך שירות חיצוני

-- אלעד - location_url
-- https://maps.app.goo.gl/NNytWJfWwDEnq1rv9
-- צריך להרחיב את הקישור הזה ידנית

-- נתיבות - location_url
-- https://maps.app.goo.gl/a7YPduKSLcQ4qy378?g_st=ipc
-- צריך להרחיב את הקישור הזה ידנית

-- צפת - location_url
-- https://app.goo.gl/D74X2rttD316f3mu8?g_st=ipc
-- צריך להרחיב את הקישור הזה ידנית

-- קיבוץ מגדל עוז - location_url
-- https://maps.app.goo.gl/UV6BgSt9QYmqHxrh7
-- צריך להרחיב את הקישור הזה ידנית

-- בינתיים, נוכל להעתיק את הקואורדינטות מ-token לדף ראשי עבור הערים שיש להן:
UPDATE cities
SET lat = token_lat, lng = token_lng
WHERE token_lat IS NOT NULL AND token_lng IS NOT NULL AND lat IS NULL;
