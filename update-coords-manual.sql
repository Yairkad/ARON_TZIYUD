-- עדכון קואורדינטות מתוך token_location_url הארוכים שכבר קיימים
-- כל הקואורדינטות האלה חולצו ידנית מה-URLs

-- 1. אלעד - בעלי התוספות
-- מתוך: https://www.google.com/maps/place/32°02'53.9"N+34°57'28.1"E/@32.048308,34.957799
UPDATE cities
SET token_lat = 32.048308, token_lng = 34.957799
WHERE name = 'אלעד - בעלי התוספות';

-- 2. גוש עציון - שמורת עוז וגאון
-- מתוך: google.co.il/maps/place/31°38'31.3"N+35°08'02.6"E/@31.6420245,35.1366159
-- המערכת כבר מחשבת: 31.64202, 35.134041
UPDATE cities
SET token_lat = 31.64202, token_lng = 35.134041
WHERE name = 'גוש עציון - שמורת עוז וגאון';

-- 3. ירושלים - העיר העתיקה
-- מתוך: /@31.7738961,35.2316462,21z... ו-!3d31.7738495!4d35.2315503
UPDATE cities
SET token_lat = 31.7738495, token_lng = 35.2315503
WHERE name = 'ירושלים - העיר העתיקה';

-- 4. נווה דניאל - המוריה
-- מתוך: /@31.6767934,35.1415911,20.12z... ו-!3d31.676801!4d35.141438
UPDATE cities
SET token_lat = 31.676801, token_lng = 35.141438
WHERE name = 'נווה דניאל - המוריה';

-- 5. קיבוץ מגדל עוז
-- מתוך: https://www.google.com/maps/place/31°38'29.1"N+35°08'33.0"E/@31.6414235,35.1450709
-- המערכת כבר מחשבת: 31.641419, 35.142496
UPDATE cities
SET token_lat = 31.641419, token_lng = 35.142496
WHERE name = 'קיבוץ מגדל עוז';

-- 6. קרית ארבע - מתחת בנין המועצה
-- מתוך: /@31.5294874,35.2015545,12z... ו-!3d31.5293675!4d35.1191527
UPDATE cities
SET token_lat = 31.5293675, token_lng = 35.1191527
WHERE name = 'קרית ארבע - מתחת בנין המועצה';

-- כעת נעתיק את הקואורדינטות מ-token ל-location_url בשביל הערים שאין להן location_url בכלל
UPDATE cities
SET lat = token_lat, lng = token_lng
WHERE token_lat IS NOT NULL
  AND token_lng IS NOT NULL
  AND (lat IS NULL OR lng IS NULL)
  AND location_url IS NULL;

-- עכשיו נטפל בקישורים הקצרים שצריכים הרחבה ידנית:
-- אתה צריך לפתוח כל קישור בדפדפן ולהעתיק את הקישור הארוך

-- אלעד - location_url קצר
-- https://maps.app.goo.gl/NNytWJfWwDEnq1rv9
-- → פתח בדפדפן → העתק URL ארוך → הרץ:
-- UPDATE cities SET lat = [LAT], lng = [LNG] WHERE name = 'אלעד - בעלי התוספות';

-- בית שמש - location_url קצר
-- https://maps.app.goo.gl/ZrnWEDMi1bFnUWzZ8
-- כבר יש קואורדינטות! אבל בדוק אם הן נכונות

-- נתיבות - location_url קצר
-- https://maps.app.goo.gl/a7YPduKSLcQ4qy378
-- → פתח בדפדפן → העתק URL ארוך → הרץ:
-- UPDATE cities SET lat = [LAT], lng = [LNG] WHERE name = 'נתיבות';

-- צפת - location_url קצר
-- https://app.goo.gl/D74X2rttD316f3mu8
-- → פתח בדפדפן → העתק URL ארוך → הרץ:
-- UPDATE cities SET lat = [LAT], lng = [LNG] WHERE name = 'צפת - בית המתנדב';

-- קיבוץ מגדל עוז - location_url קצר
-- https://maps.app.goo.gl/UV6BgSt9QYmqHxrh7
-- → פתח בדפדפן → העתק URL ארוך → הרץ:
-- UPDATE cities SET lat = [LAT], lng = [LNG] WHERE name = 'קיבוץ מגדל עוז';
