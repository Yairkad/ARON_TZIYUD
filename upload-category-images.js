const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseKey)

// מיפוי שמות קבצים לשמות קטגוריות
const fileToCategory = {
  'batery.png': 'סוללה',
  'Emergency-removebg-preview.png': 'חירום',
  'fluids-removebg-preview.png': 'נוזלים',
  'jeeps.png': 'ג\'יפים',
  'locked-door-removebg-preview.png': 'דלת נעולה',
  'safety.png': 'בטיחות',
  'sayret-removebg-preview.png': 'סיירת',
  'spray-removebg-preview.png': 'ספריי',
  'tire.png': 'צמיג',
  'tools.png': 'כלים',
  'unlock.png': 'פתיחה'
}

async function uploadCategoryImages() {
  const imagesDir = path.join(__dirname, 'תמונות', 'קטגוריות')

  console.log('📸 מתחיל להעלות תמונות קטגוריות...\n')

  // קבל את כל הקטגוריות הקיימות
  const { data: categories, error: fetchError } = await supabase
    .from('categories')
    .select('id, name, icon')

  if (fetchError) {
    console.error('❌ שגיאה בקריאת קטגוריות:', fetchError)
    return
  }

  console.log(`📋 נמצאו ${categories.length} קטגוריות במערכת\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const [fileName, categoryName] of Object.entries(fileToCategory)) {
    const filePath = path.join(imagesDir, fileName)

    // בדוק אם הקובץ קיים
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${fileName} - קובץ לא נמצא, מדלג...`)
      skipCount++
      continue
    }

    // מצא את הקטגוריה המתאימה
    const category = categories.find(c => c.name === categoryName)

    if (!category) {
      console.log(`⚠️  ${fileName} → ${categoryName} - קטגוריה לא נמצאה במערכת, מדלג...`)
      skipCount++
      continue
    }

    try {
      // קרא את הקובץ
      const fileBuffer = fs.readFileSync(filePath)
      const fileExt = path.extname(fileName)
      const storagePath = `categories/${category.id}${fileExt}`

      console.log(`📤 מעלה: ${fileName} → ${categoryName}...`)

      // העלה ל-Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('equipment-images')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/png',
          upsert: true // מחליף אם כבר קיים
        })

      if (uploadError) {
        console.error(`   ❌ שגיאה בהעלאה: ${uploadError.message}`)
        errorCount++
        continue
      }

      // קבל את ה-URL הציבורי
      const { data: urlData } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(storagePath)

      const publicUrl = urlData.publicUrl

      // עדכן את הקטגוריה במסד הנתונים
      const { error: updateError } = await supabase
        .from('categories')
        .update({ icon: publicUrl })
        .eq('id', category.id)

      if (updateError) {
        console.error(`   ❌ שגיאה בעדכון: ${updateError.message}`)
        errorCount++
        continue
      }

      console.log(`   ✅ הועלה בהצלחה! URL: ${publicUrl}`)
      successCount++

    } catch (error) {
      console.error(`   ❌ שגיאה: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 סיכום:')
  console.log(`   ✅ הצליחו: ${successCount}`)
  console.log(`   ⚠️  דולגו: ${skipCount}`)
  console.log(`   ❌ נכשלו: ${errorCount}`)
  console.log('='.repeat(60))
}

uploadCategoryImages()
