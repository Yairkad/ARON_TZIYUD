/**
 * PCD (Pitch Circle Diameter) Database
 * Maps vehicle make/model/year to bolt pattern (bolt count × bolt spacing)
 *
 * Format: bolt_count × bolt_spacing (e.g., 4×100 = 4 bolts, 100mm spacing)
 */

export interface PCDEntry {
  make: string           // Manufacturer name (English, lowercase)
  make_he?: string       // Manufacturer name (Hebrew) for matching with data.gov.il
  model: string          // Model name (English, lowercase)
  model_variants?: string[] // Alternative model names
  year_from: number      // Start year
  year_to: number | null // End year (null = current)
  bolt_count: number     // Number of bolts (4 or 5)
  bolt_spacing: number   // PCD in mm (98, 100, 108, 112, 114.3)
  center_bore?: number   // Center bore in mm (optional)
  notes?: string         // Additional notes
}

// Database of common vehicles in Israel
export const PCD_DATABASE: PCDEntry[] = [
  // ==================== TOYOTA ====================
  { make: 'toyota', make_he: 'טויוטה', model: 'yaris', year_from: 1999, year_to: 2020, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'yaris', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'corolla', year_from: 1983, year_to: 2006, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'corolla', year_from: 2007, year_to: 2018, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'corolla', year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'camry', year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'rav4', model_variants: ['rav 4'], year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'auris', year_from: 2006, year_to: 2018, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'c-hr', model_variants: ['chr', 'c hr'], year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },

  // ==================== HYUNDAI ====================
  { make: 'hyundai', make_he: 'יונדאי', model: 'i10', year_from: 2008, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'i20', year_from: 2008, year_to: 2020, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'i20', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'i30', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'elantra', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'tucson', year_from: 2004, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'santa fe', model_variants: ['santafe'], year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'kona', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'ioniq', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== KIA ====================
  { make: 'kia', make_he: 'קיה', model: 'picanto', year_from: 2004, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'kia', make_he: 'קיה', model: 'rio', year_from: 2005, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'kia', make_he: 'קיה', model: 'ceed', model_variants: ["cee'd", 'ceed'], year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'sportage', year_from: 2004, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'sorento', year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'niro', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'stonic', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'carens', model_variants: ['rondo'], year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== MAZDA ====================
  { make: 'mazda', make_he: 'מזדה', model: '2', model_variants: ['mazda2'], year_from: 2007, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'mazda', make_he: 'מזדה', model: '3', model_variants: ['mazda3'], year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mazda', make_he: 'מזדה', model: '6', model_variants: ['mazda6'], year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mazda', make_he: 'מזדה', model: 'cx-3', model_variants: ['cx3'], year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mazda', make_he: 'מזדה', model: 'cx-5', model_variants: ['cx5'], year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mazda', make_he: 'מזדה', model: 'cx-30', model_variants: ['cx30'], year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== NISSAN ====================
  { make: 'nissan', make_he: 'ניסאן', model: 'micra', year_from: 1982, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'note', year_from: 2004, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'juke', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'qashqai', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'x-trail', model_variants: ['xtrail', 'x trail'], year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },

  // ==================== SKODA ====================
  { make: 'skoda', make_he: 'סקודה', model: 'fabia', year_from: 1999, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'rapid', year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'scala', year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'octavia', year_from: 1996, year_to: 2012, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'octavia', year_from: 2013, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'superb', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'kodiaq', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'skoda', make_he: 'סקודה', model: 'karoq', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },

  // ==================== VOLKSWAGEN ====================
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 'polo', year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 'golf', year_from: 1997, year_to: 2003, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 'golf', year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 'passat', year_from: 1997, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 'tiguan', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 't-roc', model_variants: ['troc', 't roc'], year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'volkswagen', make_he: 'פולקסווגן', model: 't-cross', model_variants: ['tcross', 't cross'], year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },

  // ==================== SEAT ====================
  { make: 'seat', make_he: 'סיאט', model: 'ibiza', year_from: 2002, year_to: 2017, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'seat', make_he: 'סיאט', model: 'ibiza', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'seat', make_he: 'סיאט', model: 'leon', year_from: 2005, year_to: 2012, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'seat', make_he: 'סיאט', model: 'leon', year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'seat', make_he: 'סיאט', model: 'arona', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'seat', make_he: 'סיאט', model: 'ateca', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },

  // ==================== FORD ====================
  { make: 'ford', make_he: 'פורד', model: 'fiesta', year_from: 2002, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'ford', make_he: 'פורד', model: 'focus', year_from: 1998, year_to: 2010, bolt_count: 4, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'ford', make_he: 'פורד', model: 'focus', year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'ford', make_he: 'פורד', model: 'puma', year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'ford', make_he: 'פורד', model: 'kuga', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'ford', make_he: 'פורד', model: 'ecosport', year_from: 2013, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 63.4 },

  // ==================== FIAT ====================
  { make: 'fiat', make_he: 'פיאט', model: '500', model_variants: ['cinquecento'], year_from: 2007, year_to: null, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'fiat', make_he: 'פיאט', model: 'punto', year_from: 1999, year_to: 2018, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'fiat', make_he: 'פיאט', model: 'panda', year_from: 2003, year_to: null, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'fiat', make_he: 'פיאט', model: 'tipo', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'fiat', make_he: 'פיאט', model: 'qubo', year_from: 2007, year_to: 2021, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'fiat', make_he: 'פיאט', model: 'doblo', year_from: 2000, year_to: null, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },

  // ==================== PEUGEOT ====================
  { make: 'peugeot', make_he: 'פיג\'ו', model: '107', year_from: 2005, year_to: 2014, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '108', year_from: 2014, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '208', year_from: 2012, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '308', year_from: 2007, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '2008', year_from: 2013, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '3008', year_from: 2009, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'peugeot', make_he: 'פיג\'ו', model: '5008', year_from: 2009, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },

  // ==================== CITROEN ====================
  { make: 'citroen', make_he: 'סיטרואן', model: 'c1', year_from: 2005, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'c3', year_from: 2002, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'c4', year_from: 2004, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'c4 cactus', model_variants: ['cactus'], year_from: 2014, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'c5 aircross', model_variants: ['aircross'], year_from: 2017, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'berlingo', year_from: 2008, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'citroen', make_he: 'סיטרואן', model: 'c-elysee', model_variants: ['c elysee', 'celysee'], year_from: 2012, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },

  // ==================== RENAULT ====================
  { make: 'renault', make_he: 'רנו', model: 'clio', year_from: 1998, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'renault', make_he: 'רנו', model: 'megane', year_from: 1995, year_to: 2008, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'renault', make_he: 'רנו', model: 'megane', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'renault', make_he: 'רנו', model: 'captur', year_from: 2013, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'renault', make_he: 'רנו', model: 'kadjar', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },

  // ==================== DACIA ====================
  { make: 'dacia', make_he: 'דאצ\'יה', model: 'sandero', year_from: 2008, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'dacia', make_he: 'דאצ\'יה', model: 'logan', year_from: 2004, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 60.1 },
  { make: 'dacia', make_he: 'דאצ\'יה', model: 'duster', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },

  // ==================== SUZUKI ====================
  { make: 'suzuki', make_he: 'סוזוקי', model: 'swift', year_from: 2004, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'suzuki', make_he: 'סוזוקי', model: 'baleno', year_from: 2016, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'suzuki', make_he: 'סוזוקי', model: 'ignis', year_from: 2016, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'suzuki', make_he: 'סוזוקי', model: 'vitara', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'suzuki', make_he: 'סוזוקי', model: 's-cross', model_variants: ['sx4', 'scross'], year_from: 2013, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },

  // ==================== MITSUBISHI ====================
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'space star', model_variants: ['spacestar', 'mirage'], year_from: 2012, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'lancer', year_from: 2003, year_to: 2017, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'asx', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'outlander', year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'eclipse cross', model_variants: ['eclipse'], year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mitsubishi', make_he: 'מיצובישי', model: 'pajero', model_variants: ['montero', 'shogun'], year_from: 1999, year_to: null, bolt_count: 6, bolt_spacing: 139.7, center_bore: 67.1 },

  // ==================== HONDA ====================
  { make: 'honda', make_he: 'הונדה', model: 'jazz', model_variants: ['fit'], year_from: 2001, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'honda', make_he: 'הונדה', model: 'civic', year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'honda', make_he: 'הונדה', model: 'hr-v', model_variants: ['hrv'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'honda', make_he: 'הונדה', model: 'cr-v', model_variants: ['crv'], year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'honda', make_he: 'הונדה', model: 'insight', year_from: 1999, year_to: 2014, bolt_count: 4, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'honda', make_he: 'הונדה', model: 'insight', year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },

  // ==================== OPEL ====================
  { make: 'opel', make_he: 'אופל', model: 'corsa', year_from: 2006, year_to: 2019, bolt_count: 4, bolt_spacing: 100, center_bore: 56.6 },
  { make: 'opel', make_he: 'אופל', model: 'corsa', year_from: 2019, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'opel', make_he: 'אופל', model: 'astra', year_from: 2004, year_to: 2021, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'opel', make_he: 'אופל', model: 'astra', year_from: 2021, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'opel', make_he: 'אופל', model: 'crossland', model_variants: ['crossland x'], year_from: 2017, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'opel', make_he: 'אופל', model: 'grandland', model_variants: ['grandland x'], year_from: 2017, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'opel', make_he: 'אופל', model: 'mokka', year_from: 2012, year_to: 2020, bolt_count: 5, bolt_spacing: 105, center_bore: 56.6 },
  { make: 'opel', make_he: 'אופל', model: 'mokka', year_from: 2020, year_to: null, bolt_count: 4, bolt_spacing: 108, center_bore: 65.1 },

  // ==================== SUBARU ====================
  { make: 'subaru', make_he: 'סובארו', model: 'impreza', year_from: 1992, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'xv', model_variants: ['crosstrek', 'xv crosstrek'], year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'forester', year_from: 1997, year_to: 2014, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'forester', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'outback', year_from: 1994, year_to: 2014, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'outback', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'legacy', year_from: 1989, year_to: 2014, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'legacy', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'wrx', year_from: 2002, year_to: 2014, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'wrx', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 56.1 },
  { make: 'subaru', make_he: 'סובארו', model: 'brz', year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 56.1 },

  // ==================== DAIHATSU ====================
  { make: 'daihatsu', make_he: 'דייהטסו', model: 'sirion', year_from: 1998, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'daihatsu', make_he: 'דייהטסו', model: 'terios', year_from: 1997, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'daihatsu', make_he: 'דייהטסו', model: 'materia', year_from: 2006, year_to: 2012, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },

  // ==================== DODGE ====================
  { make: 'dodge', make_he: 'דודג\'', model: 'ram 1500', model_variants: ['ram', 'ram1500'], year_from: 2002, year_to: 2018, bolt_count: 5, bolt_spacing: 139.7, center_bore: 77.8 },
  { make: 'dodge', make_he: 'דודג\'', model: 'ram 1500', model_variants: ['ram', 'ram1500'], year_from: 2019, year_to: null, bolt_count: 6, bolt_spacing: 139.7, center_bore: 77.8 },
  { make: 'dodge', make_he: 'דודג\'', model: 'journey', year_from: 2008, year_to: 2020, bolt_count: 5, bolt_spacing: 114.3, center_bore: 71.5 },
  { make: 'dodge', make_he: 'דודג\'', model: 'nitro', year_from: 2007, year_to: 2012, bolt_count: 5, bolt_spacing: 114.3, center_bore: 71.5 },

  // ==================== CHERY ====================
  { make: 'chery', make_he: 'צ\'רי', model: 'tiggo 4', model_variants: ['tiggo4'], year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 65.1 },
  { make: 'chery', make_he: 'צ\'רי', model: 'tiggo 7', model_variants: ['tiggo7'], year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'chery', make_he: 'צ\'רי', model: 'tiggo 8', model_variants: ['tiggo8'], year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },

  // ==================== CHEVROLET ====================
  { make: 'chevrolet', make_he: 'שברולט', model: 'spark', year_from: 2005, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 56.6 },
  { make: 'chevrolet', make_he: 'שברולט', model: 'aveo', model_variants: ['sonic'], year_from: 2002, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 56.6 },
  { make: 'chevrolet', make_he: 'שברולט', model: 'cruze', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 105, center_bore: 56.6 },
  { make: 'chevrolet', make_he: 'שברולט', model: 'malibu', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 67.1 },
  { make: 'chevrolet', make_he: 'שברולט', model: 'captiva', year_from: 2006, year_to: 2018, bolt_count: 5, bolt_spacing: 115, center_bore: 70.3 },
  { make: 'chevrolet', make_he: 'שברולט', model: 'trax', year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 105, center_bore: 56.6 },

  // ==================== JEEP ====================
  { make: 'jeep', make_he: 'ג\'יפ', model: 'renegade', year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'compass', year_from: 2007, year_to: 2016, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'compass', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'cherokee', year_from: 2008, year_to: 2013, bolt_count: 5, bolt_spacing: 114.3, center_bore: 71.5 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'cherokee', year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'grand cherokee', model_variants: ['grandcherokee'], year_from: 2005, year_to: 2010, bolt_count: 5, bolt_spacing: 127, center_bore: 71.5 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'grand cherokee', model_variants: ['grandcherokee'], year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 127, center_bore: 71.5 },
  { make: 'jeep', make_he: 'ג\'יפ', model: 'wrangler', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 127, center_bore: 71.5 },

  // ==================== ALFA ROMEO ====================
  { make: 'alfa romeo', make_he: 'אלפא רומיאו', model: 'giulietta', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'alfa romeo', make_he: 'אלפא רומיאו', model: 'mito', year_from: 2008, year_to: 2018, bolt_count: 4, bolt_spacing: 98, center_bore: 58.1 },
  { make: 'alfa romeo', make_he: 'אלפא רומיאו', model: 'stelvio', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },
  { make: 'alfa romeo', make_he: 'אלפא רומיאו', model: 'giulia', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 110, center_bore: 65.1 },

  // ==================== AUDI ====================
  { make: 'audi', make_he: 'אאודי', model: 'a1', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'a3', year_from: 1996, year_to: 2003, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'a3', year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'a4', year_from: 1994, year_to: 2007, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'a4', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'audi', make_he: 'אאודי', model: 'a5', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'audi', make_he: 'אאודי', model: 'a6', year_from: 1994, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'audi', make_he: 'אאודי', model: 'q2', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'q3', year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'audi', make_he: 'אאודי', model: 'q5', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'audi', make_he: 'אאודי', model: 'q7', year_from: 2005, year_to: null, bolt_count: 5, bolt_spacing: 130, center_bore: 71.6 },

  // ==================== BMW ====================
  { make: 'bmw', make_he: 'ב.מ.וו', model: '1 series', model_variants: ['1', '116', '118', '120', '125'], year_from: 2004, year_to: 2019, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: '1 series', model_variants: ['1', '116', '118', '120', '125'], year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: '2 series', model_variants: ['2', '218', '220', '225'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: '3 series', model_variants: ['3', '318', '320', '325', '330', '335'], year_from: 1998, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: '5 series', model_variants: ['5', '520', '525', '530', '535', '540'], year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: 'x1', year_from: 2009, year_to: 2015, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: 'x1', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: 'x2', year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: 'x3', year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'bmw', make_he: 'ב.מ.וו', model: 'x5', year_from: 2000, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 74.1 },

  // ==================== MERCEDES ====================
  { make: 'mercedes', make_he: 'מרצדס', model: 'a-class', model_variants: ['a class', 'a150', 'a180', 'a200', 'a250'], year_from: 2004, year_to: 2012, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'a-class', model_variants: ['a class', 'a150', 'a180', 'a200', 'a250'], year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'b-class', model_variants: ['b class', 'b150', 'b180', 'b200'], year_from: 2005, year_to: 2011, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'b-class', model_variants: ['b class', 'b150', 'b180', 'b200'], year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'c-class', model_variants: ['c class', 'c180', 'c200', 'c220', 'c250', 'c300'], year_from: 2000, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'cla', model_variants: ['cla180', 'cla200', 'cla250'], year_from: 2013, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'e-class', model_variants: ['e class', 'e200', 'e220', 'e250', 'e300', 'e350'], year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'gla', model_variants: ['gla180', 'gla200', 'gla250'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'glb', model_variants: ['glb180', 'glb200', 'glb250'], year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'glc', model_variants: ['glc200', 'glc250', 'glc300'], year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'gle', model_variants: ['gle250', 'gle300', 'gle350'], year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'vito', year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.6 },
  { make: 'mercedes', make_he: 'מרצדס', model: 'sprinter', year_from: 2006, year_to: null, bolt_count: 6, bolt_spacing: 130, center_bore: 84.1 },

  // ==================== MINI ====================
  { make: 'mini', make_he: 'מיני', model: 'cooper', model_variants: ['one'], year_from: 2001, year_to: 2013, bolt_count: 4, bolt_spacing: 100, center_bore: 56.1 },
  { make: 'mini', make_he: 'מיני', model: 'cooper', model_variants: ['one'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'mini', make_he: 'מיני', model: 'countryman', year_from: 2010, year_to: 2016, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },
  { make: 'mini', make_he: 'מיני', model: 'countryman', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'mini', make_he: 'מיני', model: 'clubman', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },

  // ==================== VOLVO ====================
  { make: 'volvo', make_he: 'וולוו', model: 'v40', year_from: 2012, year_to: 2019, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 's40', year_from: 2004, year_to: 2012, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 's60', year_from: 2000, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 's80', year_from: 1998, year_to: 2016, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 's90', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 'v60', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 'v90', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 'xc40', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 'xc60', year_from: 2008, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },
  { make: 'volvo', make_he: 'וולוו', model: 'xc90', year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },

  // ==================== LEXUS ====================
  { make: 'lexus', make_he: 'לקסוס', model: 'ct', model_variants: ['ct200h'], year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'lexus', make_he: 'לקסוס', model: 'is', model_variants: ['is200', 'is250', 'is300'], year_from: 2005, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'lexus', make_he: 'לקסוס', model: 'es', model_variants: ['es250', 'es300', 'es350'], year_from: 2006, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'lexus', make_he: 'לקסוס', model: 'nx', model_variants: ['nx200', 'nx300'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'lexus', make_he: 'לקסוס', model: 'rx', model_variants: ['rx300', 'rx350'], year_from: 2003, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'lexus', make_he: 'לקסוס', model: 'ux', model_variants: ['ux200', 'ux250h'], year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },

  // ==================== LAND ROVER ====================
  { make: 'land rover', make_he: 'לנד רובר', model: 'freelander', year_from: 2006, year_to: 2014, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'land rover', make_he: 'לנד רובר', model: 'discovery sport', model_variants: ['discovery'], year_from: 2014, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 72.6 },
  { make: 'land rover', make_he: 'לנד רובר', model: 'range rover evoque', model_variants: ['evoque'], year_from: 2011, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 72.6 },
  { make: 'land rover', make_he: 'לנד רובר', model: 'range rover sport', year_from: 2005, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 72.6 },

  // ==================== SSANGYONG ====================
  { make: 'ssangyong', make_he: 'סאנגיונג', model: 'korando', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'ssangyong', make_he: 'סאנגיונג', model: 'tivoli', year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 66.5 },
  { make: 'ssangyong', make_he: 'סאנגיונג', model: 'rexton', year_from: 2003, year_to: null, bolt_count: 6, bolt_spacing: 139.7, center_bore: 92.3 },
  { make: 'ssangyong', make_he: 'סאנגיונג', model: 'actyon', year_from: 2006, year_to: 2015, bolt_count: 5, bolt_spacing: 130, center_bore: 84.1 },

  // ==================== CUPRA ====================
  { make: 'cupra', make_he: 'קופרה', model: 'leon', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'cupra', make_he: 'קופרה', model: 'formentor', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },
  { make: 'cupra', make_he: 'קופרה', model: 'born', year_from: 2021, year_to: null, bolt_count: 5, bolt_spacing: 112, center_bore: 57.1 },

  // ==================== MG ====================
  { make: 'mg', make_he: 'אם ג\'י', model: 'zs', year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mg', make_he: 'אם ג\'י', model: 'hs', year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mg', make_he: 'אם ג\'י', model: 'marvel r', year_from: 2021, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'mg', make_he: 'אם ג\'י', model: 'ehs', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== BYD ====================
  { make: 'byd', make_he: 'ביי די', model: 'atto 3', model_variants: ['atto3', 'yuan plus'], year_from: 2022, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'byd', make_he: 'ביי די', model: 'han', year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'byd', make_he: 'ביי די', model: 'tang', year_from: 2018, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'byd', make_he: 'ביי די', model: 'seal', year_from: 2022, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== GEELY ====================
  { make: 'geely', make_he: 'ג\'ילי', model: 'emgrand', year_from: 2009, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'geely', make_he: 'ג\'ילי', model: 'atlas', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'geely', make_he: 'ג\'ילי', model: 'coolray', model_variants: ['proton x50'], year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 108, center_bore: 63.4 },

  // ==================== TESLA ====================
  { make: 'tesla', make_he: 'טסלה', model: 'model 3', model_variants: ['model3'], year_from: 2017, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'tesla', make_he: 'טסלה', model: 'model y', model_variants: ['modely'], year_from: 2020, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 64.1 },
  { make: 'tesla', make_he: 'טסלה', model: 'model s', model_variants: ['models'], year_from: 2012, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 64.1 },
  { make: 'tesla', make_he: 'טסלה', model: 'model x', model_variants: ['modelx'], year_from: 2015, year_to: null, bolt_count: 5, bolt_spacing: 120, center_bore: 64.1 },

  // ==================== ISUZU ====================
  { make: 'isuzu', make_he: 'איסוזו', model: 'd-max', model_variants: ['dmax'], year_from: 2002, year_to: null, bolt_count: 6, bolt_spacing: 139.7, center_bore: 106 },

  // ==================== TOYOTA (ADDITIONAL) ====================
  { make: 'toyota', make_he: 'טויוטה', model: 'prius', year_from: 2003, year_to: 2015, bolt_count: 5, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'prius', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'avensis', year_from: 2003, year_to: 2018, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'verso', year_from: 2009, year_to: 2018, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'hilux', year_from: 2005, year_to: null, bolt_count: 6, bolt_spacing: 139.7, center_bore: 106 },
  { make: 'toyota', make_he: 'טויוטה', model: 'land cruiser', model_variants: ['landcruiser'], year_from: 2002, year_to: null, bolt_count: 5, bolt_spacing: 150, center_bore: 110.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'aygo', year_from: 2005, year_to: 2014, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'aygo', year_from: 2014, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'aygo x', model_variants: ['aygox'], year_from: 2022, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'highlander', year_from: 2007, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },
  { make: 'toyota', make_he: 'טויוטה', model: 'bz4x', year_from: 2022, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 60.1 },

  // ==================== HYUNDAI (ADDITIONAL) ====================
  { make: 'hyundai', make_he: 'יונדאי', model: 'bayon', year_from: 2021, year_to: null, bolt_count: 4, bolt_spacing: 100, center_bore: 54.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'venue', year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'ioniq 5', model_variants: ['ioniq5'], year_from: 2021, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'hyundai', make_he: 'יונדאי', model: 'ioniq 6', model_variants: ['ioniq6'], year_from: 2022, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== KIA (ADDITIONAL) ====================
  { make: 'kia', make_he: 'קיה', model: 'ev6', year_from: 2021, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'soul', year_from: 2009, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'xceed', year_from: 2019, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },
  { make: 'kia', make_he: 'קיה', model: 'carnival', year_from: 1999, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 67.1 },

  // ==================== NISSAN (ADDITIONAL) ====================
  { make: 'nissan', make_he: 'ניסאן', model: 'leaf', year_from: 2010, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'navara', year_from: 2004, year_to: null, bolt_count: 6, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'pulsar', year_from: 2014, year_to: 2018, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'kicks', year_from: 2016, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
  { make: 'nissan', make_he: 'ניסאן', model: 'ariya', year_from: 2021, year_to: null, bolt_count: 5, bolt_spacing: 114.3, center_bore: 66.1 },
]

/**
 * Find PCD data for a vehicle
 */
export function findPCD(make: string, model: string, year: number): PCDEntry | null {
  const normalizedMake = make.toLowerCase().trim()
  const normalizedModel = model.toLowerCase().trim()

  // First try exact match
  let match = PCD_DATABASE.find(entry => {
    const makeMatch = entry.make === normalizedMake || entry.make_he === make
    const modelMatch = entry.model === normalizedModel ||
                       entry.model_variants?.some(v => v.toLowerCase() === normalizedModel)
    const yearMatch = year >= entry.year_from && (entry.year_to === null || year <= entry.year_to)

    return makeMatch && modelMatch && yearMatch
  })

  if (match) return match

  // Try partial match on model (e.g., "COROLLA" should match "corolla")
  match = PCD_DATABASE.find(entry => {
    const makeMatch = entry.make === normalizedMake ||
                      entry.make_he === make ||
                      normalizedMake.includes(entry.make) ||
                      entry.make.includes(normalizedMake)
    const modelMatch = normalizedModel.includes(entry.model) ||
                       entry.model.includes(normalizedModel) ||
                       entry.model_variants?.some(v =>
                         normalizedModel.includes(v.toLowerCase()) || v.toLowerCase().includes(normalizedModel)
                       )
    const yearMatch = year >= entry.year_from && (entry.year_to === null || year <= entry.year_to)

    return makeMatch && modelMatch && yearMatch
  })

  return match || null
}

/**
 * Extract make name from Hebrew manufacturer string
 * e.g., "פיאט תורכיה" -> "fiat"
 */
export function extractMakeFromHebrew(hebrewMake: string): string | null {
  const lowerMake = hebrewMake.toLowerCase()

  // Check each entry for Hebrew match
  for (const entry of PCD_DATABASE) {
    if (entry.make_he && hebrewMake.includes(entry.make_he)) {
      return entry.make
    }
  }

  // Direct mappings for common variations
  const hebrewToEnglish: Record<string, string> = {
    'טויוטה': 'toyota',
    'יונדאי': 'hyundai',
    'קיה': 'kia',
    'מזדה': 'mazda',
    'ניסאן': 'nissan',
    'סקודה': 'skoda',
    'פולקסווגן': 'volkswagen',
    'סיאט': 'seat',
    'פורד': 'ford',
    'פיאט': 'fiat',
    'פיג\'ו': 'peugeot',
    'פיזו': 'peugeot',
    'סיטרואן': 'citroen',
    'רנו': 'renault',
    'דאצ\'יה': 'dacia',
    'דציה': 'dacia',
    'סוזוקי': 'suzuki',
    'מיצובישי': 'mitsubishi',
    'הונדה': 'honda',
    'אופל': 'opel',
    'סובארו': 'subaru',
    'דייהטסו': 'daihatsu',
    'דודג\'': 'dodge',
    'דודג': 'dodge',
    'צ\'רי': 'chery',
    'צרי': 'chery',
    'שברולט': 'chevrolet',
    'ג\'יפ': 'jeep',
    'גיפ': 'jeep',
    'אלפא רומיאו': 'alfa romeo',
    'אלפא': 'alfa romeo',
    'אאודי': 'audi',
    'ב.מ.וו': 'bmw',
    'במוו': 'bmw',
    'מרצדס': 'mercedes',
    'מיני': 'mini',
    'וולוו': 'volvo',
    'לקסוס': 'lexus',
    'לנד רובר': 'land rover',
    'סאנגיונג': 'ssangyong',
    'קופרה': 'cupra',
    'אם ג\'י': 'mg',
    'ביי די': 'byd',
    'ג\'ילי': 'geely',
    'טסלה': 'tesla',
    'איסוזו': 'isuzu',
  }

  for (const [hebrew, english] of Object.entries(hebrewToEnglish)) {
    if (hebrewMake.includes(hebrew)) {
      return english
    }
  }

  return null
}
