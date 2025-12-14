/**
 * Vehicle PCD Data Scraper from wheel-size.com
 * Fetches PCD data for popular car models in Israel
 * Target: 1000+ models
 */

const fs = require('fs');
const path = require('path');

// Hebrew translations for all makes
const hebrewMakes = {
  'Toyota': 'טויוטה',
  'BMW': 'ב.מ.וו',
  'Mercedes-Benz': 'מרצדס',
  'Audi': 'אאודי',
  'Volkswagen': 'פולקסווגן',
  'Honda': 'הונדה',
  'Mazda': 'מאזדה',
  'Hyundai': 'יונדאי',
  'Kia': 'קיה',
  'Nissan': 'ניסאן',
  'Mitsubishi': 'מיצובישי',
  'Subaru': 'סובארו',
  'Suzuki': 'סוזוקי',
  'Ford': 'פורד',
  'Chevrolet': 'שברולט',
  'Peugeot': 'פיג\'ו',
  'Citroen': 'סיטרואן',
  'Renault': 'רנו',
  'Skoda': 'סקודה',
  'Seat': 'סיאט',
  'Opel': 'אופל',
  'Fiat': 'פיאט',
  'Alfa Romeo': 'אלפא רומיאו',
  'Volvo': 'וולוו',
  'Lexus': 'לקסוס',
  'Infiniti': 'אינפיניטי',
  'Jeep': 'ג\'יפ',
  'Land Rover': 'לנד רובר',
  'Mini': 'מיני',
  'Porsche': 'פורשה',
  'Tesla': 'טסלה',
  'Dacia': 'דאצ\'יה',
  'Cupra': 'קופרה',
  'MG': 'אם.ג\'י',
  'BYD': 'ביד',
  'Geely': 'ג\'ילי',
  'Chery': 'צ\'רי',
  'JAC': 'ג\'אק',
  'DFSK': 'די.אף.אס.קיי',
  'Ssangyong': 'סאנגיונג',
  'Isuzu': 'איסוזו',
  'Dodge': 'דודג\'',
  'Chrysler': 'קרייזלר',
  'Jaguar': 'יגואר',
  'Maserati': 'מזראטי',
  'Genesis': 'ג\'נסיס',
  'Acura': 'אקורה',
  'Cadillac': 'קדילק',
  'Lincoln': 'לינקולן',
  'Buick': 'ביואיק',
  'GMC': 'ג\'י.אמ.סי',
  'RAM': 'ראם',
  'Saab': 'סאאב',
  'Lancia': 'לנצ\'יה',
  'Smart': 'סמארט',
  'Daihatsu': 'דייהטסו'
};

// Popular years to check
const defaultYears = [2015, 2018, 2020, 2022, 2023, 2024];
const olderYears = [2005, 2008, 2010, 2012, 2015, 2018, 2020, 2023];
const extendedYears = [2000, 2005, 2010, 2015, 2018, 2020, 2022, 2023, 2024];

// List of vehicles to scrape - comprehensive list for Israeli market
const vehiclesToScrape = [
  // ==================== HONDA ====================
  { make: 'Honda', model: 'Civic', years: extendedYears },
  { make: 'Honda', model: 'Accord', years: extendedYears },
  { make: 'Honda', model: 'CR-V', years: extendedYears },
  { make: 'Honda', model: 'HR-V', years: [2015, 2018, 2022, 2023, 2024] },
  { make: 'Honda', model: 'Jazz', years: [2008, 2014, 2020, 2023] },
  { make: 'Honda', model: 'Fit', years: [2007, 2014, 2020, 2023] },
  { make: 'Honda', model: 'City', years: [2014, 2020, 2023] },
  { make: 'Honda', model: 'Pilot', years: [2009, 2016, 2023] },
  { make: 'Honda', model: 'Odyssey', years: [2011, 2018, 2023] },
  { make: 'Honda', model: 'CR-Z', years: [2011, 2015] },
  { make: 'Honda', model: 'Insight', years: [2010, 2019, 2022] },
  { make: 'Honda', model: 'e', years: [2020, 2023] },
  { make: 'Honda', model: 'ZR-V', years: [2023, 2024] },

  // ==================== MAZDA ====================
  { make: 'Mazda', model: '2', years: [2008, 2015, 2020, 2023] },
  { make: 'Mazda', model: '3', years: extendedYears },
  { make: 'Mazda', model: '6', years: extendedYears },
  { make: 'Mazda', model: 'CX-3', years: [2015, 2018, 2021, 2023] },
  { make: 'Mazda', model: 'CX-30', years: [2020, 2022, 2023, 2024] },
  { make: 'Mazda', model: 'CX-5', years: [2012, 2017, 2022, 2023, 2024] },
  { make: 'Mazda', model: 'CX-50', years: [2023, 2024] },
  { make: 'Mazda', model: 'CX-60', years: [2022, 2023, 2024] },
  { make: 'Mazda', model: 'CX-90', years: [2023, 2024] },
  { make: 'Mazda', model: 'CX-9', years: [2007, 2016, 2023] },
  { make: 'Mazda', model: 'MX-5', years: [2006, 2016, 2019, 2023] },
  { make: 'Mazda', model: 'MX-30', years: [2021, 2023] },
  { make: 'Mazda', model: 'BT-50', years: [2012, 2021] },

  // ==================== HYUNDAI ====================
  { make: 'Hyundai', model: 'i10', years: [2008, 2014, 2020, 2023] },
  { make: 'Hyundai', model: 'i20', years: [2009, 2015, 2020, 2023] },
  { make: 'Hyundai', model: 'i30', years: [2007, 2012, 2017, 2022, 2023] },
  { make: 'Hyundai', model: 'i40', years: [2012, 2015, 2019] },
  { make: 'Hyundai', model: 'Elantra', years: extendedYears },
  { make: 'Hyundai', model: 'Sonata', years: extendedYears },
  { make: 'Hyundai', model: 'Accent', years: [2006, 2011, 2018, 2023] },
  { make: 'Hyundai', model: 'Tucson', years: [2005, 2010, 2015, 2021, 2023, 2024] },
  { make: 'Hyundai', model: 'Santa Fe', years: [2006, 2013, 2019, 2023, 2024] },
  { make: 'Hyundai', model: 'Kona', years: [2018, 2021, 2023, 2024] },
  { make: 'Hyundai', model: 'Bayon', years: [2021, 2023] },
  { make: 'Hyundai', model: 'Venue', years: [2020, 2023] },
  { make: 'Hyundai', model: 'Palisade', years: [2020, 2023] },
  { make: 'Hyundai', model: 'Ioniq', years: [2017, 2020, 2022] },
  { make: 'Hyundai', model: 'Ioniq 5', years: [2022, 2023, 2024] },
  { make: 'Hyundai', model: 'Ioniq 6', years: [2023, 2024] },
  { make: 'Hyundai', model: 'Nexo', years: [2019, 2023] },
  { make: 'Hyundai', model: 'Staria', years: [2022, 2023] },
  { make: 'Hyundai', model: 'Creta', years: [2016, 2020, 2023] },
  { make: 'Hyundai', model: 'Veloster', years: [2012, 2019] },
  { make: 'Hyundai', model: 'Genesis', years: [2009, 2014] },

  // ==================== KIA ====================
  { make: 'Kia', model: 'Picanto', years: [2008, 2012, 2017, 2021, 2023] },
  { make: 'Kia', model: 'Rio', years: [2006, 2012, 2017, 2021, 2023] },
  { make: 'Kia', model: 'Ceed', years: [2007, 2012, 2018, 2022, 2023] },
  { make: 'Kia', model: 'Cerato', years: [2009, 2013, 2019, 2022] },
  { make: 'Kia', model: 'Forte', years: [2010, 2014, 2019, 2022, 2023] },
  { make: 'Kia', model: 'Optima', years: [2011, 2016, 2020] },
  { make: 'Kia', model: 'K5', years: [2021, 2023] },
  { make: 'Kia', model: 'Stinger', years: [2018, 2022, 2023] },
  { make: 'Kia', model: 'Sportage', years: [2005, 2010, 2016, 2022, 2023, 2024] },
  { make: 'Kia', model: 'Sorento', years: [2003, 2010, 2015, 2021, 2023, 2024] },
  { make: 'Kia', model: 'Seltos', years: [2020, 2023] },
  { make: 'Kia', model: 'Niro', years: [2017, 2020, 2023] },
  { make: 'Kia', model: 'EV6', years: [2022, 2023, 2024] },
  { make: 'Kia', model: 'EV9', years: [2024] },
  { make: 'Kia', model: 'Soul', years: [2009, 2014, 2020, 2023] },
  { make: 'Kia', model: 'Carnival', years: [2006, 2015, 2021, 2023] },
  { make: 'Kia', model: 'Stonic', years: [2018, 2021, 2023] },
  { make: 'Kia', model: 'XCeed', years: [2020, 2023] },

  // ==================== NISSAN ====================
  { make: 'Nissan', model: 'Micra', years: [2003, 2010, 2017, 2021] },
  { make: 'Nissan', model: 'Note', years: [2006, 2013, 2021] },
  { make: 'Nissan', model: 'Sentra', years: [2007, 2013, 2020, 2023] },
  { make: 'Nissan', model: 'Altima', years: [2007, 2013, 2019, 2023] },
  { make: 'Nissan', model: 'Maxima', years: [2009, 2016, 2023] },
  { make: 'Nissan', model: 'Qashqai', years: [2007, 2014, 2021, 2023, 2024] },
  { make: 'Nissan', model: 'X-Trail', years: [2007, 2014, 2022, 2023] },
  { make: 'Nissan', model: 'Juke', years: [2011, 2020, 2023] },
  { make: 'Nissan', model: 'Kicks', years: [2017, 2021, 2023] },
  { make: 'Nissan', model: 'Murano', years: [2009, 2015, 2019] },
  { make: 'Nissan', model: 'Pathfinder', years: [2005, 2013, 2022] },
  { make: 'Nissan', model: 'Patrol', years: [2010, 2020, 2023] },
  { make: 'Nissan', model: 'Navara', years: [2005, 2015, 2021] },
  { make: 'Nissan', model: 'Leaf', years: [2011, 2018, 2023] },
  { make: 'Nissan', model: 'Ariya', years: [2022, 2023, 2024] },
  { make: 'Nissan', model: '370Z', years: [2009, 2020] },
  { make: 'Nissan', model: 'Z', years: [2023, 2024] },
  { make: 'Nissan', model: 'GT-R', years: [2009, 2017, 2023] },

  // ==================== MITSUBISHI ====================
  { make: 'Mitsubishi', model: 'Mirage', years: [2012, 2020, 2023] },
  { make: 'Mitsubishi', model: 'Attrage', years: [2014, 2020, 2023] },
  { make: 'Mitsubishi', model: 'Lancer', years: [2008, 2017] },
  { make: 'Mitsubishi', model: 'ASX', years: [2010, 2016, 2020, 2023] },
  { make: 'Mitsubishi', model: 'Eclipse Cross', years: [2018, 2021, 2023] },
  { make: 'Mitsubishi', model: 'Outlander', years: [2006, 2013, 2022, 2023, 2024] },
  { make: 'Mitsubishi', model: 'Pajero', years: [2007, 2014, 2020] },
  { make: 'Mitsubishi', model: 'Pajero Sport', years: [2016, 2020, 2023] },
  { make: 'Mitsubishi', model: 'L200', years: [2006, 2015, 2019, 2023] },
  { make: 'Mitsubishi', model: 'Space Star', years: [2013, 2020, 2023] },

  // ==================== SUBARU ====================
  { make: 'Subaru', model: 'Impreza', years: [2008, 2012, 2017, 2023] },
  { make: 'Subaru', model: 'WRX', years: [2015, 2022, 2024] },
  { make: 'Subaru', model: 'Legacy', years: [2010, 2015, 2020] },
  { make: 'Subaru', model: 'Levorg', years: [2015, 2021] },
  { make: 'Subaru', model: 'XV', years: [2012, 2017, 2022] },
  { make: 'Subaru', model: 'Crosstrek', years: [2018, 2023, 2024] },
  { make: 'Subaru', model: 'Forester', years: [2008, 2013, 2019, 2022, 2024] },
  { make: 'Subaru', model: 'Outback', years: [2010, 2015, 2020, 2023] },
  { make: 'Subaru', model: 'BRZ', years: [2013, 2022, 2024] },
  { make: 'Subaru', model: 'Ascent', years: [2019, 2023] },
  { make: 'Subaru', model: 'Solterra', years: [2023, 2024] },

  // ==================== SUZUKI ====================
  { make: 'Suzuki', model: 'Swift', years: [2005, 2011, 2017, 2023] },
  { make: 'Suzuki', model: 'Baleno', years: [2016, 2022] },
  { make: 'Suzuki', model: 'Ignis', years: [2016, 2020, 2023] },
  { make: 'Suzuki', model: 'Vitara', years: [2015, 2019, 2023] },
  { make: 'Suzuki', model: 'S-Cross', years: [2014, 2022, 2023] },
  { make: 'Suzuki', model: 'Jimny', years: [1998, 2018, 2023] },
  { make: 'Suzuki', model: 'Grand Vitara', years: [2006, 2015] },
  { make: 'Suzuki', model: 'SX4', years: [2006, 2014] },
  { make: 'Suzuki', model: 'Celerio', years: [2014, 2022] },
  { make: 'Suzuki', model: 'Alto', years: [2009, 2015, 2022] },
  { make: 'Suzuki', model: 'Swace', years: [2021, 2023] },
  { make: 'Suzuki', model: 'Across', years: [2021, 2023] },

  // ==================== VOLKSWAGEN ====================
  { make: 'Volkswagen', model: 'Polo', years: [2002, 2009, 2017, 2022, 2023] },
  { make: 'Volkswagen', model: 'Golf', years: extendedYears },
  { make: 'Volkswagen', model: 'Golf GTI', years: [2010, 2015, 2020, 2023] },
  { make: 'Volkswagen', model: 'Golf R', years: [2015, 2022, 2023] },
  { make: 'Volkswagen', model: 'Jetta', years: [2006, 2011, 2019, 2023] },
  { make: 'Volkswagen', model: 'Passat', years: extendedYears },
  { make: 'Volkswagen', model: 'Arteon', years: [2018, 2021, 2023] },
  { make: 'Volkswagen', model: 'Tiguan', years: [2008, 2016, 2021, 2023, 2024] },
  { make: 'Volkswagen', model: 'T-Roc', years: [2018, 2022, 2023] },
  { make: 'Volkswagen', model: 'T-Cross', years: [2019, 2023] },
  { make: 'Volkswagen', model: 'Taigo', years: [2022, 2023] },
  { make: 'Volkswagen', model: 'Touareg', years: [2003, 2010, 2018, 2023] },
  { make: 'Volkswagen', model: 'Touran', years: [2003, 2015, 2021] },
  { make: 'Volkswagen', model: 'Sharan', years: [2010, 2019] },
  { make: 'Volkswagen', model: 'Caddy', years: [2004, 2015, 2021] },
  { make: 'Volkswagen', model: 'Transporter', years: [2003, 2015, 2020] },
  { make: 'Volkswagen', model: 'Caravelle', years: [2015, 2021] },
  { make: 'Volkswagen', model: 'ID.3', years: [2020, 2023] },
  { make: 'Volkswagen', model: 'ID.4', years: [2021, 2023, 2024] },
  { make: 'Volkswagen', model: 'ID.5', years: [2022, 2023] },
  { make: 'Volkswagen', model: 'ID.7', years: [2024] },
  { make: 'Volkswagen', model: 'ID. Buzz', years: [2023, 2024] },
  { make: 'Volkswagen', model: 'Up', years: [2012, 2020] },
  { make: 'Volkswagen', model: 'Beetle', years: [2012, 2019] },
  { make: 'Volkswagen', model: 'Scirocco', years: [2009, 2014] },
  { make: 'Volkswagen', model: 'CC', years: [2012, 2017] },

  // ==================== AUDI ====================
  { make: 'Audi', model: 'A1', years: [2010, 2019, 2023] },
  { make: 'Audi', model: 'A3', years: [2003, 2012, 2020, 2023] },
  { make: 'Audi', model: 'A4', years: extendedYears },
  { make: 'Audi', model: 'A5', years: [2008, 2017, 2023] },
  { make: 'Audi', model: 'A6', years: extendedYears },
  { make: 'Audi', model: 'A7', years: [2011, 2019, 2023] },
  { make: 'Audi', model: 'A8', years: [2010, 2018, 2023] },
  { make: 'Audi', model: 'Q2', years: [2017, 2021, 2023] },
  { make: 'Audi', model: 'Q3', years: [2012, 2019, 2023] },
  { make: 'Audi', model: 'Q4 e-tron', years: [2022, 2023, 2024] },
  { make: 'Audi', model: 'Q5', years: [2009, 2017, 2021, 2023] },
  { make: 'Audi', model: 'Q7', years: [2006, 2015, 2020, 2023] },
  { make: 'Audi', model: 'Q8', years: [2019, 2023] },
  { make: 'Audi', model: 'e-tron', years: [2019, 2023] },
  { make: 'Audi', model: 'e-tron GT', years: [2022, 2024] },
  { make: 'Audi', model: 'TT', years: [2006, 2014, 2019] },
  { make: 'Audi', model: 'R8', years: [2008, 2015, 2020] },
  { make: 'Audi', model: 'S3', years: [2013, 2020, 2023] },
  { make: 'Audi', model: 'S4', years: [2009, 2017, 2020] },
  { make: 'Audi', model: 'S5', years: [2008, 2017, 2020] },
  { make: 'Audi', model: 'RS3', years: [2015, 2022, 2024] },
  { make: 'Audi', model: 'RS4', years: [2013, 2020] },
  { make: 'Audi', model: 'RS5', years: [2010, 2018, 2020] },
  { make: 'Audi', model: 'RS6', years: [2013, 2020, 2023] },
  { make: 'Audi', model: 'RS7', years: [2014, 2020, 2023] },

  // ==================== MERCEDES-BENZ ====================
  { make: 'Mercedes-Benz', model: 'A-Class', years: [2012, 2018, 2023] },
  { make: 'Mercedes-Benz', model: 'B-Class', years: [2012, 2019, 2023] },
  { make: 'Mercedes-Benz', model: 'C-Class', years: extendedYears },
  { make: 'Mercedes-Benz', model: 'CLA', years: [2014, 2020, 2023] },
  { make: 'Mercedes-Benz', model: 'CLS', years: [2011, 2018, 2022] },
  { make: 'Mercedes-Benz', model: 'E-Class', years: extendedYears },
  { make: 'Mercedes-Benz', model: 'S-Class', years: [2006, 2013, 2021, 2023] },
  { make: 'Mercedes-Benz', model: 'GLA', years: [2014, 2020, 2023] },
  { make: 'Mercedes-Benz', model: 'GLB', years: [2020, 2023] },
  { make: 'Mercedes-Benz', model: 'GLC', years: [2016, 2020, 2023, 2024] },
  { make: 'Mercedes-Benz', model: 'GLE', years: [2015, 2019, 2023] },
  { make: 'Mercedes-Benz', model: 'GLS', years: [2016, 2020, 2023] },
  { make: 'Mercedes-Benz', model: 'G-Class', years: [2012, 2018, 2023] },
  { make: 'Mercedes-Benz', model: 'EQA', years: [2021, 2023] },
  { make: 'Mercedes-Benz', model: 'EQB', years: [2022, 2023] },
  { make: 'Mercedes-Benz', model: 'EQC', years: [2019, 2023] },
  { make: 'Mercedes-Benz', model: 'EQE', years: [2022, 2023] },
  { make: 'Mercedes-Benz', model: 'EQS', years: [2022, 2023, 2024] },
  { make: 'Mercedes-Benz', model: 'AMG GT', years: [2015, 2018, 2020, 2024] },
  { make: 'Mercedes-Benz', model: 'SL', years: [2012, 2022] },
  { make: 'Mercedes-Benz', model: 'SLC', years: [2016, 2020] },
  { make: 'Mercedes-Benz', model: 'Vito', years: [2014, 2020] },
  { make: 'Mercedes-Benz', model: 'V-Class', years: [2014, 2019, 2023] },
  { make: 'Mercedes-Benz', model: 'Sprinter', years: [2006, 2018, 2023] },

  // ==================== SKODA ====================
  { make: 'Skoda', model: 'Fabia', years: [2007, 2014, 2021, 2023] },
  { make: 'Skoda', model: 'Scala', years: [2019, 2023] },
  { make: 'Skoda', model: 'Rapid', years: [2013, 2017] },
  { make: 'Skoda', model: 'Octavia', years: [2004, 2013, 2020, 2023] },
  { make: 'Skoda', model: 'Superb', years: [2008, 2015, 2019, 2024] },
  { make: 'Skoda', model: 'Kamiq', years: [2019, 2023] },
  { make: 'Skoda', model: 'Karoq', years: [2018, 2022, 2023] },
  { make: 'Skoda', model: 'Kodiaq', years: [2017, 2022, 2024] },
  { make: 'Skoda', model: 'Enyaq', years: [2021, 2023, 2024] },
  { make: 'Skoda', model: 'Citigo', years: [2012, 2019] },
  { make: 'Skoda', model: 'Yeti', years: [2010, 2017] },

  // ==================== SEAT ====================
  { make: 'Seat', model: 'Ibiza', years: [2008, 2017, 2022, 2023] },
  { make: 'Seat', model: 'Leon', years: [2005, 2012, 2020, 2023] },
  { make: 'Seat', model: 'Arona', years: [2018, 2022, 2023] },
  { make: 'Seat', model: 'Ateca', years: [2017, 2020, 2023] },
  { make: 'Seat', model: 'Tarraco', years: [2019, 2023] },
  { make: 'Seat', model: 'Alhambra', years: [2010, 2015, 2020] },
  { make: 'Seat', model: 'Toledo', years: [2012, 2019] },
  { make: 'Seat', model: 'Mii', years: [2012, 2019] },

  // ==================== CUPRA ====================
  { make: 'Cupra', model: 'Formentor', years: [2021, 2023, 2024] },
  { make: 'Cupra', model: 'Leon', years: [2020, 2023] },
  { make: 'Cupra', model: 'Born', years: [2022, 2023] },
  { make: 'Cupra', model: 'Ateca', years: [2019, 2022] },
  { make: 'Cupra', model: 'Tavascan', years: [2024] },

  // ==================== PEUGEOT ====================
  { make: 'Peugeot', model: '108', years: [2014, 2019] },
  { make: 'Peugeot', model: '208', years: [2012, 2019, 2023] },
  { make: 'Peugeot', model: '308', years: [2008, 2013, 2021, 2023] },
  { make: 'Peugeot', model: '408', years: [2022, 2023] },
  { make: 'Peugeot', model: '508', years: [2011, 2019, 2023] },
  { make: 'Peugeot', model: '2008', years: [2013, 2020, 2023] },
  { make: 'Peugeot', model: '3008', years: [2009, 2016, 2021, 2023] },
  { make: 'Peugeot', model: '5008', years: [2010, 2017, 2024] },
  { make: 'Peugeot', model: 'Partner', years: [2008, 2018] },
  { make: 'Peugeot', model: 'Rifter', years: [2019, 2023] },
  { make: 'Peugeot', model: 'Traveller', years: [2017, 2022] },
  { make: 'Peugeot', model: 'e-208', years: [2020, 2023] },
  { make: 'Peugeot', model: 'e-2008', years: [2020, 2023] },

  // ==================== CITROEN ====================
  { make: 'Citroen', model: 'C1', years: [2005, 2014, 2019] },
  { make: 'Citroen', model: 'C3', years: [2002, 2009, 2016, 2023] },
  { make: 'Citroen', model: 'C3 Aircross', years: [2018, 2021, 2024] },
  { make: 'Citroen', model: 'C4', years: [2004, 2010, 2020, 2023] },
  { make: 'Citroen', model: 'C4 Cactus', years: [2014, 2018] },
  { make: 'Citroen', model: 'C5', years: [2008, 2017] },
  { make: 'Citroen', model: 'C5 X', years: [2022, 2023] },
  { make: 'Citroen', model: 'C5 Aircross', years: [2019, 2022, 2023] },
  { make: 'Citroen', model: 'Berlingo', years: [2008, 2018, 2023] },
  { make: 'Citroen', model: 'SpaceTourer', years: [2017, 2022] },
  { make: 'Citroen', model: 'DS3', years: [2010, 2016] },
  { make: 'Citroen', model: 'DS4', years: [2011, 2015] },
  { make: 'Citroen', model: 'DS5', years: [2012, 2018] },

  // ==================== RENAULT ====================
  { make: 'Renault', model: 'Clio', years: [2005, 2012, 2019, 2023] },
  { make: 'Renault', model: 'Megane', years: [2003, 2008, 2016, 2022] },
  { make: 'Renault', model: 'Captur', years: [2013, 2020, 2023] },
  { make: 'Renault', model: 'Kadjar', years: [2015, 2019, 2022] },
  { make: 'Renault', model: 'Austral', years: [2023, 2024] },
  { make: 'Renault', model: 'Koleos', years: [2017, 2020] },
  { make: 'Renault', model: 'Arkana', years: [2021, 2023] },
  { make: 'Renault', model: 'Scenic', years: [2003, 2009, 2016] },
  { make: 'Renault', model: 'Espace', years: [2015, 2023] },
  { make: 'Renault', model: 'Talisman', years: [2016, 2020] },
  { make: 'Renault', model: 'Fluence', years: [2010, 2016] },
  { make: 'Renault', model: 'Kangoo', years: [2008, 2021] },
  { make: 'Renault', model: 'Trafic', years: [2014, 2021] },
  { make: 'Renault', model: 'Master', years: [2010, 2019] },
  { make: 'Renault', model: 'Zoe', years: [2013, 2020, 2023] },
  { make: 'Renault', model: 'Twingo', years: [2014, 2019] },
  { make: 'Renault', model: 'Megane E-Tech', years: [2022, 2023] },

  // ==================== DACIA ====================
  { make: 'Dacia', model: 'Sandero', years: [2008, 2012, 2021, 2023] },
  { make: 'Dacia', model: 'Logan', years: [2004, 2012, 2021] },
  { make: 'Dacia', model: 'Duster', years: [2010, 2018, 2024] },
  { make: 'Dacia', model: 'Jogger', years: [2022, 2023] },
  { make: 'Dacia', model: 'Spring', years: [2021, 2023] },
  { make: 'Dacia', model: 'Lodgy', years: [2012, 2021] },
  { make: 'Dacia', model: 'Dokker', years: [2013, 2021] },

  // ==================== OPEL ====================
  { make: 'Opel', model: 'Corsa', years: [2006, 2014, 2019, 2023] },
  { make: 'Opel', model: 'Astra', years: [2004, 2010, 2015, 2022, 2023] },
  { make: 'Opel', model: 'Insignia', years: [2009, 2017, 2022] },
  { make: 'Opel', model: 'Mokka', years: [2012, 2021, 2023] },
  { make: 'Opel', model: 'Crossland', years: [2017, 2021, 2023] },
  { make: 'Opel', model: 'Grandland', years: [2018, 2022, 2024] },
  { make: 'Opel', model: 'Combo', years: [2012, 2018, 2023] },
  { make: 'Opel', model: 'Vivaro', years: [2014, 2019] },
  { make: 'Opel', model: 'Zafira', years: [2005, 2012, 2017, 2019] },
  { make: 'Opel', model: 'Meriva', years: [2010, 2017] },
  { make: 'Opel', model: 'Adam', years: [2013, 2019] },
  { make: 'Opel', model: 'Karl', years: [2015, 2019] },
  { make: 'Opel', model: 'Ampera', years: [2012, 2015] },

  // ==================== FIAT ====================
  { make: 'Fiat', model: '500', years: [2007, 2015, 2020, 2023] },
  { make: 'Fiat', model: '500X', years: [2015, 2019, 2023] },
  { make: 'Fiat', model: '500L', years: [2013, 2018] },
  { make: 'Fiat', model: 'Panda', years: [2003, 2012, 2021] },
  { make: 'Fiat', model: 'Tipo', years: [2016, 2020, 2023] },
  { make: 'Fiat', model: 'Punto', years: [2005, 2012, 2018] },
  { make: 'Fiat', model: 'Bravo', years: [2007, 2014] },
  { make: 'Fiat', model: 'Doblo', years: [2010, 2015, 2021] },
  { make: 'Fiat', model: 'Ducato', years: [2006, 2014, 2021] },
  { make: 'Fiat', model: 'Freemont', years: [2012, 2016] },
  { make: 'Fiat', model: 'Qubo', years: [2008, 2020] },
  { make: 'Fiat', model: 'Talento', years: [2016, 2021] },

  // ==================== ALFA ROMEO ====================
  { make: 'Alfa Romeo', model: 'Giulietta', years: [2010, 2016, 2020] },
  { make: 'Alfa Romeo', model: 'Giulia', years: [2016, 2020, 2023] },
  { make: 'Alfa Romeo', model: 'Stelvio', years: [2017, 2020, 2023] },
  { make: 'Alfa Romeo', model: 'Tonale', years: [2022, 2023] },
  { make: 'Alfa Romeo', model: '4C', years: [2014, 2019] },
  { make: 'Alfa Romeo', model: 'MiTo', years: [2009, 2018] },

  // ==================== FORD ====================
  { make: 'Ford', model: 'Fiesta', years: [2008, 2013, 2017, 2022] },
  { make: 'Ford', model: 'Focus', years: [2005, 2011, 2018, 2022] },
  { make: 'Ford', model: 'Mondeo', years: [2007, 2014, 2022] },
  { make: 'Ford', model: 'Fusion', years: [2013, 2017, 2020] },
  { make: 'Ford', model: 'Mustang', years: [2005, 2015, 2024] },
  { make: 'Ford', model: 'Mustang Mach-E', years: [2021, 2023, 2024] },
  { make: 'Ford', model: 'EcoSport', years: [2014, 2018, 2022] },
  { make: 'Ford', model: 'Puma', years: [2020, 2023] },
  { make: 'Ford', model: 'Kuga', years: [2008, 2013, 2020, 2023] },
  { make: 'Ford', model: 'Escape', years: [2013, 2020, 2023] },
  { make: 'Ford', model: 'Edge', years: [2015, 2019, 2023] },
  { make: 'Ford', model: 'Explorer', years: [2011, 2020, 2023] },
  { make: 'Ford', model: 'Bronco', years: [2021, 2023, 2024] },
  { make: 'Ford', model: 'Bronco Sport', years: [2021, 2023] },
  { make: 'Ford', model: 'F-150', years: [2009, 2015, 2021, 2024] },
  { make: 'Ford', model: 'Ranger', years: [2012, 2019, 2023] },
  { make: 'Ford', model: 'Transit', years: [2006, 2014, 2020] },
  { make: 'Ford', model: 'Transit Custom', years: [2013, 2018, 2023] },
  { make: 'Ford', model: 'Trxxxxxxxxxxxct', years: [2009, 2014, 2019] },
  { make: 'Ford', model: 'S-Max', years: [2006, 2015] },
  { make: 'Ford', model: 'Galaxy', years: [2006, 2015] },
  { make: 'Ford', model: 'C-Max', years: [2010, 2015] },
  { make: 'Ford', model: 'B-Max', years: [2012, 2017] },
  { make: 'Ford', model: 'Ka', years: [2009, 2016] },

  // ==================== CHEVROLET ====================
  { make: 'Chevrolet', model: 'Spark', years: [2010, 2016, 2022] },
  { make: 'Chevrolet', model: 'Aveo', years: [2006, 2012] },
  { make: 'Chevrolet', model: 'Cruze', years: [2009, 2016, 2019] },
  { make: 'Chevrolet', model: 'Malibu', years: [2012, 2016, 2023] },
  { make: 'Chevrolet', model: 'Camaro', years: [2010, 2016, 2023, 2024] },
  { make: 'Chevrolet', model: 'Corvette', years: [2005, 2014, 2020, 2024] },
  { make: 'Chevrolet', model: 'Equinox', years: [2010, 2018, 2024] },
  { make: 'Chevrolet', model: 'Trax', years: [2013, 2017, 2024] },
  { make: 'Chevrolet', model: 'Blazer', years: [2019, 2023] },
  { make: 'Chevrolet', model: 'Traverse', years: [2009, 2018, 2024] },
  { make: 'Chevrolet', model: 'Tahoe', years: [2007, 2015, 2021] },
  { make: 'Chevrolet', model: 'Suburban', years: [2007, 2015, 2021] },
  { make: 'Chevrolet', model: 'Silverado', years: [2007, 2014, 2019, 2024] },
  { make: 'Chevrolet', model: 'Colorado', years: [2012, 2023] },
  { make: 'Chevrolet', model: 'Bolt', years: [2017, 2022] },
  { make: 'Chevrolet', model: 'Bolt EUV', years: [2022, 2023] },
  { make: 'Chevrolet', model: 'Orlando', years: [2011, 2018] },
  { make: 'Chevrolet', model: 'Captiva', years: [2007, 2018, 2022] },
  { make: 'Chevrolet', model: 'Trailblazer', years: [2021, 2023] },

  // ==================== JEEP ====================
  { make: 'Jeep', model: 'Renegade', years: [2015, 2019, 2023] },
  { make: 'Jeep', model: 'Compass', years: [2007, 2017, 2022] },
  { make: 'Jeep', model: 'Cherokee', years: [2014, 2019, 2023] },
  { make: 'Jeep', model: 'Grand Cherokee', years: [2005, 2011, 2022, 2024] },
  { make: 'Jeep', model: 'Wrangler', years: [2007, 2018, 2023] },
  { make: 'Jeep', model: 'Gladiator', years: [2020, 2023] },
  { make: 'Jeep', model: 'Avenger', years: [2023, 2024] },

  // ==================== VOLVO ====================
  { make: 'Volvo', model: 'V40', years: [2012, 2019] },
  { make: 'Volvo', model: 'V60', years: [2010, 2018, 2023] },
  { make: 'Volvo', model: 'V90', years: [2017, 2021] },
  { make: 'Volvo', model: 'S60', years: [2010, 2019, 2023] },
  { make: 'Volvo', model: 'S90', years: [2017, 2021, 2023] },
  { make: 'Volvo', model: 'XC40', years: [2018, 2021, 2023, 2024] },
  { make: 'Volvo', model: 'XC60', years: [2008, 2017, 2022, 2024] },
  { make: 'Volvo', model: 'XC90', years: [2003, 2015, 2020, 2024] },
  { make: 'Volvo', model: 'C40 Recharge', years: [2022, 2023] },
  { make: 'Volvo', model: 'EX30', years: [2024] },
  { make: 'Volvo', model: 'EX90', years: [2024] },

  // ==================== LEXUS ====================
  { make: 'Lexus', model: 'CT', years: [2011, 2018] },
  { make: 'Lexus', model: 'IS', years: [2006, 2013, 2021, 2023] },
  { make: 'Lexus', model: 'ES', years: [2007, 2013, 2019, 2023] },
  { make: 'Lexus', model: 'GS', years: [2006, 2012, 2016] },
  { make: 'Lexus', model: 'LS', years: [2007, 2013, 2018, 2023] },
  { make: 'Lexus', model: 'UX', years: [2019, 2023] },
  { make: 'Lexus', model: 'NX', years: [2015, 2022, 2023, 2024] },
  { make: 'Lexus', model: 'RX', years: [2004, 2009, 2016, 2023, 2024] },
  { make: 'Lexus', model: 'LX', years: [2008, 2016, 2022] },
  { make: 'Lexus', model: 'GX', years: [2010, 2024] },
  { make: 'Lexus', model: 'LC', years: [2018, 2021] },
  { make: 'Lexus', model: 'RC', years: [2015, 2019] },
  { make: 'Lexus', model: 'RZ', years: [2023, 2024] },

  // ==================== LAND ROVER ====================
  { make: 'Land Rover', model: 'Defender', years: [2020, 2023] },
  { make: 'Land Rover', model: 'Discovery', years: [2004, 2009, 2017, 2021] },
  { make: 'Land Rover', model: 'Discovery Sport', years: [2015, 2020, 2023] },
  { make: 'Land Rover', model: 'Range Rover', years: [2002, 2012, 2022, 2023] },
  { make: 'Land Rover', model: 'Range Rover Sport', years: [2005, 2013, 2022, 2023] },
  { make: 'Land Rover', model: 'Range Rover Velar', years: [2018, 2021, 2023] },
  { make: 'Land Rover', model: 'Range Rover Evoque', years: [2012, 2019, 2023] },
  { make: 'Land Rover', model: 'Freelander', years: [2006, 2014] },

  // ==================== MINI ====================
  { make: 'Mini', model: 'Cooper', years: [2007, 2014, 2021, 2024] },
  { make: 'Mini', model: 'Clubman', years: [2008, 2015, 2020] },
  { make: 'Mini', model: 'Countryman', years: [2011, 2017, 2023, 2024] },
  { make: 'Mini', model: 'Paceman', years: [2013, 2016] },
  { make: 'Mini', model: 'Coupe', years: [2012, 2015] },
  { make: 'Mini', model: 'Convertible', years: [2009, 2016, 2021] },

  // ==================== PORSCHE ====================
  { make: 'Porsche', model: '911', years: [2005, 2012, 2019, 2023] },
  { make: 'Porsche', model: 'Boxster', years: [2005, 2012, 2017] },
  { make: 'Porsche', model: 'Cayman', years: [2006, 2013, 2019] },
  { make: 'Porsche', model: '718 Boxster', years: [2017, 2020, 2023] },
  { make: 'Porsche', model: '718 Cayman', years: [2017, 2020, 2023] },
  { make: 'Porsche', model: 'Panamera', years: [2010, 2017, 2024] },
  { make: 'Porsche', model: 'Cayenne', years: [2003, 2011, 2018, 2023] },
  { make: 'Porsche', model: 'Macan', years: [2014, 2019, 2024] },
  { make: 'Porsche', model: 'Taycan', years: [2020, 2023, 2024] },

  // ==================== TESLA ====================
  { make: 'Tesla', model: 'Model S', years: [2012, 2016, 2021, 2023] },
  { make: 'Tesla', model: 'Model 3', years: [2018, 2021, 2024] },
  { make: 'Tesla', model: 'Model X', years: [2016, 2021, 2023] },
  { make: 'Tesla', model: 'Model Y', years: [2020, 2022, 2024] },
  { make: 'Tesla', model: 'Cybertruck', years: [2024] },

  // ==================== GENESIS ====================
  { make: 'Genesis', model: 'G70', years: [2018, 2022, 2024] },
  { make: 'Genesis', model: 'G80', years: [2017, 2021, 2024] },
  { make: 'Genesis', model: 'G90', years: [2017, 2023] },
  { make: 'Genesis', model: 'GV60', years: [2022, 2024] },
  { make: 'Genesis', model: 'GV70', years: [2021, 2024] },
  { make: 'Genesis', model: 'GV80', years: [2020, 2024] },

  // ==================== CHINESE BRANDS ====================
  // BYD
  { make: 'BYD', model: 'Atto 3', years: [2022, 2023, 2024] },
  { make: 'BYD', model: 'Dolphin', years: [2022, 2024] },
  { make: 'BYD', model: 'Seal', years: [2023, 2024] },
  { make: 'BYD', model: 'Han', years: [2020, 2023] },
  { make: 'BYD', model: 'Tang', years: [2021, 2023] },

  // MG
  { make: 'MG', model: 'ZS', years: [2017, 2020, 2023] },
  { make: 'MG', model: 'ZS EV', years: [2020, 2023] },
  { make: 'MG', model: 'HS', years: [2019, 2023] },
  { make: 'MG', model: 'MG4', years: [2022, 2023, 2024] },
  { make: 'MG', model: 'MG5', years: [2022, 2023] },
  { make: 'MG', model: 'Marvel R', years: [2021, 2023] },

  // Geely
  { make: 'Geely', model: 'Coolray', years: [2019, 2023] },
  { make: 'Geely', model: 'Emgrand', years: [2016, 2021, 2023] },
  { make: 'Geely', model: 'Atlas', years: [2018, 2023] },
  { make: 'Geely', model: 'Geometry C', years: [2021, 2023] },

  // Chery
  { make: 'Chery', model: 'Tiggo 4', years: [2019, 2023] },
  { make: 'Chery', model: 'Tiggo 7', years: [2019, 2023] },
  { make: 'Chery', model: 'Tiggo 8', years: [2018, 2023] },
  { make: 'Chery', model: 'Arrizo 5', years: [2016, 2021] },

  // ==================== OTHER BRANDS ====================
  // Infiniti
  { make: 'Infiniti', model: 'Q30', years: [2016, 2019] },
  { make: 'Infiniti', model: 'Q50', years: [2014, 2018, 2023] },
  { make: 'Infiniti', model: 'Q60', years: [2017, 2020] },
  { make: 'Infiniti', model: 'Q70', years: [2014, 2019] },
  { make: 'Infiniti', model: 'QX30', years: [2017, 2019] },
  { make: 'Infiniti', model: 'QX50', years: [2013, 2019, 2023] },
  { make: 'Infiniti', model: 'QX55', years: [2022, 2023] },
  { make: 'Infiniti', model: 'QX60', years: [2013, 2022, 2024] },
  { make: 'Infiniti', model: 'QX70', years: [2014, 2017] },
  { make: 'Infiniti', model: 'QX80', years: [2011, 2018, 2023] },

  // Jaguar
  { make: 'Jaguar', model: 'XE', years: [2015, 2020, 2023] },
  { make: 'Jaguar', model: 'XF', years: [2008, 2015, 2021] },
  { make: 'Jaguar', model: 'XJ', years: [2010, 2016, 2019] },
  { make: 'Jaguar', model: 'E-Pace', years: [2018, 2021, 2023] },
  { make: 'Jaguar', model: 'F-Pace', years: [2016, 2021, 2024] },
  { make: 'Jaguar', model: 'I-Pace', years: [2019, 2022, 2024] },
  { make: 'Jaguar', model: 'F-Type', years: [2014, 2018, 2021] },

  // Maserati
  { make: 'Maserati', model: 'Ghibli', years: [2014, 2018, 2021] },
  { make: 'Maserati', model: 'Quattroporte', years: [2013, 2017, 2021] },
  { make: 'Maserati', model: 'Levante', years: [2016, 2019, 2023] },
  { make: 'Maserati', model: 'GranTurismo', years: [2007, 2018, 2023] },
  { make: 'Maserati', model: 'Grecale', years: [2022, 2023] },

  // Ssangyong
  { make: 'Ssangyong', model: 'Tivoli', years: [2015, 2020, 2023] },
  { make: 'Ssangyong', model: 'Korando', years: [2011, 2019, 2022] },
  { make: 'Ssangyong', model: 'Rexton', years: [2003, 2017, 2021] },
  { make: 'Ssangyong', model: 'Musso', years: [2018, 2021] },
  { make: 'Ssangyong', model: 'Torres', years: [2023] },

  // Isuzu
  { make: 'Isuzu', model: 'D-Max', years: [2012, 2019, 2023] },
  { make: 'Isuzu', model: 'MU-X', years: [2014, 2021] },

  // Smart
  { make: 'Smart', model: 'ForTwo', years: [2007, 2014, 2020] },
  { make: 'Smart', model: 'ForFour', years: [2015, 2020] },
  { make: 'Smart', model: '#1', years: [2023, 2024] },
  { make: 'Smart', model: '#3', years: [2024] },

  // Daihatsu
  { make: 'Daihatsu', model: 'Sirion', years: [2005, 2013] },
  { make: 'Daihatsu', model: 'Terios', years: [2006, 2017] },
  { make: 'Daihatsu', model: 'Copen', years: [2003, 2014] },
  { make: 'Daihatsu', model: 'Rocky', years: [2019, 2023] },
];

// Delay function to avoid overwhelming the server
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch PCD data from wheel-size.com
async function fetchPCDData(make, model, year) {
  try {
    const makeSlug = make.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.wheel-size.com/size/${makeSlug}/${modelSlug}/${year}/`;

    console.log(`Fetching: ${make} ${model} ${year}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`  ❌ Not found (${response.status})`);
      return null;
    }

    const html = await response.text();

    // Parse PCD data - look for bolt pattern in various formats
    const pcdPatterns = [
      /(\d+)x([\d.]+)\s*mm/gi,  // 5x114.3 mm
      /PCD[:\s]+(\d+)x([\d.]+)/gi,  // PCD: 5x114.3
      /Bolt\s*Pattern[:\s]+(\d+)x([\d.]+)/gi,  // Bolt Pattern: 5x114.3
      /(\d)[\s]*[xX×][\s]*([\d.]+)/g  // General pattern
    ];

    let boltCount = null;
    let boltSpacing = null;

    for (const regex of pcdPatterns) {
      const match = regex.exec(html);
      if (match) {
        boltCount = parseInt(match[1]);
        boltSpacing = parseFloat(match[2]);
        if (boltCount >= 3 && boltCount <= 8 && boltSpacing > 50 && boltSpacing < 200) {
          break;
        }
      }
    }

    if (!boltCount || !boltSpacing) {
      console.log(`  ❌ No PCD data found`);
      return null;
    }

    // Extract center bore
    const centerBorePatterns = [
      /(?:CB|Center\s*Bore|Hub\s*Bore)[:\s]+([\d.]+)/i,
      /DIA[:\s]+([\d.]+)/i,
      /([\d.]+)\s*mm\s*(?:center|hub)/i
    ];

    let centerBore = null;
    for (const regex of centerBorePatterns) {
      const match = html.match(regex);
      if (match) {
        centerBore = parseFloat(match[1]);
        if (centerBore > 40 && centerBore < 130) {
          break;
        }
      }
    }

    console.log(`  ✅ ${boltCount}x${boltSpacing} CB:${centerBore || 'N/A'}`);

    return {
      make: make.toLowerCase().replace(/-/g, ' '),
      make_he: hebrewMakes[make] || make,
      model: model.toLowerCase(),
      variants: '',
      year: year,
      bolt_count: boltCount,
      bolt_spacing: boltSpacing,
      center_bore: centerBore || ''
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

// Consolidate year ranges
function consolidateYearRanges(results) {
  const vehicleMap = new Map();

  for (const item of results) {
    const key = `${item.make}|${item.model}|${item.bolt_count}|${item.bolt_spacing}|${item.center_bore}`;

    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        ...item,
        year_from: item.year,
        year_to: item.year
      });
    } else {
      const existing = vehicleMap.get(key);
      existing.year_from = Math.min(existing.year_from, item.year);
      existing.year_to = Math.max(existing.year_to, item.year);
    }
  }

  // Convert to array and clean up year_to if it's 2024
  return Array.from(vehicleMap.values()).map(v => ({
    make: v.make,
    make_he: v.make_he,
    model: v.model,
    variants: v.variants,
    year_from: v.year_from,
    year_to: v.year_to >= 2024 ? '' : v.year_to,
    bolt_count: v.bolt_count,
    bolt_spacing: v.bolt_spacing,
    center_bore: v.center_bore
  }));
}

// Main scraping function
async function scrapeVehicles() {
  const results = [];
  let successCount = 0;
  let failCount = 0;
  const totalRequests = vehiclesToScrape.reduce((sum, v) => sum + v.years.length, 0);

  console.log(`\n🚗 Starting vehicle data scraping...`);
  console.log(`📋 Total requests to make: ${totalRequests}`);
  console.log(`📋 Unique vehicle models: ${vehiclesToScrape.length}\n`);

  let requestCount = 0;
  for (const vehicle of vehiclesToScrape) {
    for (const year of vehicle.years) {
      requestCount++;
      console.log(`[${requestCount}/${totalRequests}]`);

      const data = await fetchPCDData(vehicle.make, vehicle.model, year);

      if (data) {
        results.push(data);
        successCount++;
      } else {
        failCount++;
      }

      // Wait 1.5 seconds between requests to be polite
      await delay(1500);
    }
  }

  console.log(`\n✅ Successfully scraped: ${successCount} entries`);
  console.log(`❌ Failed: ${failCount} entries`);

  // Consolidate year ranges
  const consolidated = consolidateYearRanges(results);
  console.log(`📊 Consolidated to ${consolidated.length} unique vehicle configurations\n`);

  return consolidated;
}

// Save to CSV
function saveToCSV(data) {
  const csvHeader = 'make,make_he,model,variants,year_from,year_to,bolt_count,bolt_spacing,center_bore\n';
  const csvRows = data.map(row =>
    `${row.make},${row.make_he},${row.model},${row.variants},${row.year_from},${row.year_to},${row.bolt_count},${row.bolt_spacing},${row.center_bore}`
  ).join('\n');

  const csvContent = csvHeader + csvRows;
  const outputPath = path.join(__dirname, '..', 'data', 'scraped-vehicles.csv');

  fs.writeFileSync(outputPath, csvContent, 'utf8');
  console.log(`💾 Saved to: ${outputPath}`);

  return outputPath;
}

// Run the scraper
(async () => {
  try {
    const results = await scrapeVehicles();

    if (results.length > 0) {
      const filePath = saveToCSV(results);
      console.log(`\n🎉 Done! ${results.length} vehicle configurations saved to ${filePath}`);
      console.log(`\nYou can now merge this file with your existing vehicle data`);
    } else {
      console.log('\n❌ No vehicles were successfully scraped');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
})();
