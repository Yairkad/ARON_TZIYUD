'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'

interface Wheel {
  id: string
  wheel_number: string
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  is_donut: boolean
  is_available: boolean
}

interface Station {
  id: string
  name: string
  address: string
}

export default function SignFormPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params)
  const [station, setStation] = useState<Station | null>(null)
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [borrowDate, setBorrowDate] = useState('')
  const [selectedWheelId, setSelectedWheelId] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [depositType, setDepositType] = useState('')
  const [notes, setNotes] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  useEffect(() => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0]
    setBorrowDate(today)
    fetchStationData()
  }, [stationId])

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = 150
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [loading])

  const fetchStationData = async () => {
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}`)
      if (!response.ok) throw new Error('Failed to fetch station')
      const data = await response.json()
      setStation(data.station)
      // Filter only available wheels
      setWheels(data.station.wheels.filter((w: Wheel) => w.is_available))
    } catch (err) {
      setError('שגיאה בטעינת נתוני התחנה')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    setIsDrawing(true)
    setHasSigned(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas || !hasSigned) return null
    return canvas.toDataURL('image/png')
  }

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim()) {
      alert('נא למלא שם פרטי')
      return
    }
    if (!lastName.trim()) {
      alert('נא למלא שם משפחה')
      return
    }
    if (!idNumber.trim() || idNumber.length < 9) {
      alert('נא למלא תעודת זהות (9 ספרות)')
      return
    }
    if (!phone.trim()) {
      alert('נא למלא מספר טלפון')
      return
    }
    if (!address.trim()) {
      alert('נא למלא כתובת מגורים')
      return
    }
    if (!selectedWheelId) {
      alert('נא לבחור צמיג')
      return
    }
    if (!vehicleModel.trim()) {
      alert('נא למלא דגם הרכב')
      return
    }
    if (!depositType) {
      alert('נא לבחור אופן תשלום פיקדון')
      return
    }
    if (!hasSigned) {
      alert('נא לחתום על הטופס')
      return
    }
    if (!agreedTerms) {
      alert('נא לאשר את תנאי ההשאלה')
      return
    }

    const signatureData = getSignatureData()
    if (!signatureData) {
      alert('נא לחתום על הטופס')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/wheel-stations/${stationId}/public-borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wheel_id: selectedWheelId,
          borrower_name: `${firstName} ${lastName}`.trim(),
          borrower_phone: phone,
          borrower_id_number: idNumber,
          borrower_address: address,
          vehicle_model: vehicleModel,
          borrow_date: borrowDate,
          deposit_type: depositType,
          notes: notes,
          signature_data: signatureData,
          terms_accepted: true
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה בשליחת הטופס')
      }

      setSubmitted(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'שגיאה בשליחת הטופס')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>טוען טופס...</p>
        </div>
      </div>
    )
  }

  if (error || !station) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>{error || 'תחנה לא נמצאה'}</p>
          <Link href="/wheels" style={styles.backLink}>חזרה לרשימת התחנות</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.successScreen}>
          <div style={styles.successIcon}>⏳</div>
          <h2 style={styles.successTitle}>תודה! הטופס נשלח בהצלחה</h2>
          <p style={styles.successText}>
            פרטי ההתחייבות נשמרו במערכת.<br />
            <strong>הבקשה ממתינה לאישור מנהל התחנה.</strong>
          </p>
          <div style={styles.warningBox}>
            <strong>לאחר אישור המנהל, יש להחזיר את הצמיג תוך 72 שעות!</strong>
          </div>
          <Link href="/wheels" style={styles.backBtn}>
            חזרה לדף הראשי
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🛞 השאלת צמיג - {station.name}</h1>
        <p style={styles.subtitle}>טופס להשאלת גלגל מתחנת השאלת צמיגים</p>

        {/* Intro text */}
        <div style={styles.infoBox}>
          <p>עמותת ידידים סיוע בדרכים סניף ירושלים מאפשרת לשאול צמיגים לפרק זמן מוגבל על מנת לעזור במקרים בהם אין פנצ'ריות פתוחות, ולא ניתן לבצע תיקון זמני.</p>
          <p style={{ marginTop: '10px' }}>אנו מבקשים להחזיר את הצמיג בהקדם האפשרי ועד 72 שעות ממועד ההשאלה, על מנת שנוכל להמשיך ולסייע לאנשים נוספים.</p>
          <p style={{ marginTop: '10px' }}>ארגון ידידים פועל בהתנדבות מלאה, ותרומות עוזרות לארגון ברכישת ציוד - <a href="https://yedidim-il.org" target="_blank" rel="noopener noreferrer" style={styles.link}>ניתן לתרום כאן</a></p>
          <p style={{ marginTop: '10px' }}>להצטרפות למעצמה - פנו להנהלת הסניף או <a href="https://yedidim-il.org" target="_blank" rel="noopener noreferrer" style={styles.link}>בקישור זה</a></p>
        </div>

        {/* Personal Details Section */}
        <div style={styles.sectionTitle}>פרטים אישיים</div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>שם פרטי <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="ישראל"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>שם משפחה <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="ישראלי"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>תעודת זהות <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={idNumber}
            onChange={e => setIdNumber(e.target.value)}
            placeholder="123456789"
            maxLength={9}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>טלפון <span style={styles.required}>*</span></label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="050-1234567"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>כתובת מגורים <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="רחוב הרצל 1, ירושלים"
            style={styles.input}
          />
        </div>

        {/* Loan Details Section */}
        <div style={styles.sectionTitle}>פרטי ההשאלה</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>תאריך השאלה <span style={styles.required}>*</span></label>
          <input
            type="date"
            value={borrowDate}
            onChange={e => setBorrowDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>מספר צמיג <span style={styles.required}>*</span></label>
          <select
            value={selectedWheelId}
            onChange={e => setSelectedWheelId(e.target.value)}
            style={styles.input}
          >
            <option value="">בחר צמיג...</option>
            {wheels.map(wheel => (
              <option key={wheel.id} value={wheel.id}>
                {wheel.wheel_number} - {wheel.rim_size}" | {wheel.bolt_count}×{wheel.bolt_spacing}
                {wheel.is_donut ? ' | דונאט' : ''} | זמין ✅
              </option>
            ))}
          </select>
          <p style={styles.helpText}>מוצגים רק צמיגים זמינים בתחנה זו</p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>דגם הרכב <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={vehicleModel}
            onChange={e => setVehicleModel(e.target.value)}
            placeholder="יונדאי i25"
            style={styles.input}
          />
        </div>

        {/* Deposit Section */}
        <div style={styles.sectionTitle}>פיקדון</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>אופן תשלום הפיקדון <span style={styles.required}>*</span></label>
          <div style={styles.radioGroup}>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="deposit"
                value="cash"
                checked={depositType === 'cash'}
                onChange={e => setDepositType(e.target.value)}
              />
              <span>₪500 מזומן</span>
            </label>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="deposit"
                value="bit"
                checked={depositType === 'bit'}
                onChange={e => setDepositType(e.target.value)}
              />
              <span>₪500 בביט ל-050-3044088</span>
            </label>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="deposit"
                value="id"
                checked={depositType === 'id'}
                onChange={e => setDepositType(e.target.value)}
              />
              <span>פיקדון תעודת זהות (באישור מנהל)</span>
            </label>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="deposit"
                value="license"
                checked={depositType === 'license'}
                onChange={e => setDepositType(e.target.value)}
              />
              <span>פיקדון רישיון נהיגה (באישור מנהל)</span>
            </label>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>הערות נוספות (אופציונלי)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="פרטים נוספים..."
            rows={2}
            style={styles.textarea}
          />
        </div>

        {/* Terms Section */}
        <div style={styles.sectionTitle}>תנאי השאלה והתחייבות</div>

        <div style={styles.terms}>
          <p><strong>תקנון השאלת גלגל:</strong></p>
          <ol style={styles.termsList}>
            <li>הפונה מתחייב להחזיר את הצמיג בתוך <strong>72 שעות</strong>, ולהשאיר כפקדון 500 ש"ח במזומן או בביט למספר 050-3044088.</li>
            <li>הפונה יקבל חזרה את הפקדון בעת החזרת הצמיג. במידה והצמיג לא יוחזר בתוך 72 שעות, סכום הכסף יועבר כתרומה לידידים.</li>
            <li><strong>הפונה מבין שזהו תיקון חירום בלבד!</strong> והגלגל עשוי להיות במידה מעט שונה/לפגוע ביציבות הרכב ולכן מתחייב לא לנהוג במהירות מעל 80 קמ"ש וכן שלא תהיה לו שום תלונה על הסיוע שקיבל.</li>
            <li>במקרים חריגים ניתן להאריך את זמן ההשאלה עד 5 ימים, באישור מנהל התחנה או סג"מ התחנה.</li>
            <li>במקרים חריגים (באישור מנהל/סג"מ התחנה) ניתן להפקיד כערבון תעודה מזהה במקום פקדון כספי.</li>
          </ol>
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={e => setAgreedTerms(e.target.checked)}
          />
          <span>קראתי את התנאים ואני מסכים/ה להם <span style={styles.required}>*</span></span>
        </label>

        {/* Signature */}
        <div style={styles.formGroup}>
          <label style={styles.label}>חתימה <span style={styles.required}>*</span></label>
          <div style={{
            ...styles.signatureContainer,
            ...(hasSigned ? styles.signatureSigned : {})
          }}>
            {!hasSigned && (
              <span style={styles.signaturePlaceholder}>חתמו כאן עם האצבע</span>
            )}
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <button
            type="button"
            onClick={clearSignature}
            style={styles.clearBtn}
          >
            🗑️ נקה חתימה
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...styles.submitBtn,
            ...(submitting ? styles.submitBtnDisabled : {})
          }}
        >
          {submitting ? 'שולח...' : '✅ שליחת הטופס'}
        </button>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#1f2937',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    direction: 'rtl',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    color: '#fff',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#fff',
  },
  backLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    marginTop: '20px',
    display: 'inline-block',
  },
  card: {
    background: '#374151',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    color: '#f59e0b',
    fontSize: '1.5rem',
    marginBottom: '5px',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  infoBox: {
    background: '#1e3a5f',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#93c5fd',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  link: {
    color: '#60a5fa',
  },
  sectionTitle: {
    color: '#60a5fa',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '20px',
    marginBottom: '15px',
    paddingBottom: '8px',
    borderBottom: '1px solid #4b5563',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    color: '#9ca3af',
    fontSize: '0.9rem',
    marginBottom: '5px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#1f2937',
    color: '#fff',
    fontSize: '1rem',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#1f2937',
    color: '#fff',
    fontSize: '1rem',
    resize: 'vertical',
  },
  helpText: {
    color: '#6b7280',
    fontSize: '0.8rem',
    marginTop: '5px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#1f2937',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#fff',
  },
  terms: {
    background: '#1f2937',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    maxHeight: '200px',
    overflowY: 'auto',
    color: '#d1d5db',
    fontSize: '0.9rem',
  },
  termsList: {
    paddingRight: '20px',
    marginTop: '10px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '20px',
    cursor: 'pointer',
    color: '#fff',
  },
  signatureContainer: {
    background: '#fff',
    borderRadius: '8px',
    border: '2px dashed #d1d5db',
    height: '150px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signatureSigned: {
    borderStyle: 'solid',
    borderColor: '#10b981',
    background: '#f0fdf4',
  },
  signaturePlaceholder: {
    color: '#6b7280',
    position: 'absolute',
    pointerEvents: 'none',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
  },
  clearBtn: {
    marginTop: '10px',
    padding: '8px 16px',
    background: '#4b5563',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  // Success screen
  successScreen: {
    maxWidth: '400px',
    margin: '50px auto',
    textAlign: 'center',
    background: '#374151',
    borderRadius: '12px',
    padding: '30px',
  },
  successIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  successTitle: {
    color: '#fff',
    fontSize: '1.3rem',
    marginBottom: '15px',
  },
  successText: {
    color: '#9ca3af',
    marginBottom: '20px',
    lineHeight: 1.6,
  },
  warningBox: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  backBtn: {
    display: 'inline-block',
    padding: '12px 24px',
    background: '#3b82f6',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
  },
}
