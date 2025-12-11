'use client'

import { useState, useEffect, useRef, use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Wheel {
  id: string
  wheel_number: string
  rim_size: string
  bolt_count: number
  bolt_spacing: number
  is_donut: boolean
  is_available: boolean
  notes?: string
}

interface PaymentMethods {
  cash?: boolean
  bit?: { enabled: boolean; phone: string }
  paybox?: { enabled: boolean; phone: string }
  bank_transfer?: { enabled: boolean; details: string }
  id_deposit?: boolean
  license_deposit?: boolean
}

interface Station {
  id: string
  name: string
  address: string
  deposit_amount?: number
  payment_methods?: PaymentMethods
}

function SignFormContent({ stationId }: { stationId: string }) {
  const searchParams = useSearchParams()
  const [station, setStation] = useState<Station | null>(null)
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Pre-filled data from URL params
  const prefilledWheelNumber = searchParams.get('wheel')
  const prefilledPhone = searchParams.get('phone')
  const isPrefilledMode = !!(prefilledWheelNumber && prefilledPhone)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState(prefilledPhone || '')
  const [address, setAddress] = useState('')
  const [borrowDate, setBorrowDate] = useState('')
  const [selectedWheelId, setSelectedWheelId] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [depositType, setDepositType] = useState('')
  const [notes, setNotes] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<string[]>([])

  // Terms scroll tracking
  const termsRef = useRef<HTMLDivElement>(null)
  const [canAgreeTerms, setCanAgreeTerms] = useState(false)

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

  // Auto-select wheel when data is loaded and we have prefilled wheel number
  useEffect(() => {
    if (wheels.length > 0 && prefilledWheelNumber && !selectedWheelId) {
      const matchingWheel = wheels.find(w => w.wheel_number === prefilledWheelNumber)
      if (matchingWheel) {
        setSelectedWheelId(matchingWheel.id)
      }
    }
  }, [wheels, prefilledWheelNumber, selectedWheelId])

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
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [loading])

  // Track terms scroll to enable checkbox
  const handleTermsScroll = () => {
    const termsEl = termsRef.current
    if (!termsEl) return
    const isAtBottom = termsEl.scrollHeight - termsEl.scrollTop <= termsEl.clientHeight + 20
    if (isAtBottom && !canAgreeTerms) {
      setCanAgreeTerms(true)
    }
  }

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
    // Validation - collect all errors
    const errors: string[] = []

    if (!firstName.trim()) errors.push('firstName')
    if (!lastName.trim()) errors.push('lastName')
    if (!idNumber.trim() || idNumber.length < 9) errors.push('idNumber')
    if (!phone.trim()) errors.push('phone')
    if (!address.trim()) errors.push('address')
    if (!selectedWheelId) errors.push('wheelId')
    if (!vehicleModel.trim()) errors.push('vehicleModel')
    if (!depositType) errors.push('depositType')
    if (!hasSigned) errors.push('signature')
    if (!agreedTerms) errors.push('terms')

    setFieldErrors(errors)

    if (errors.length > 0) {
      toast.error('נא למלא את כל השדות המסומנים', { id: 'validation-error' })
      return
    }

    const signatureData = getSignatureData()
    if (!signatureData) {
      toast.error('נא לחתום על הטופס', { id: 'signature-error' })
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
      toast.error(err instanceof Error ? err.message : 'שגיאה בשליחת הטופס')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinnerEmoji}>🛞</div>
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
            <strong>לאחר אישור המנהל, יש להחזיר את הגלגל תוך 72 שעות!</strong>
          </div>
        </div>
      </div>
    )
  }

  // Helper for input style with error
  const getInputStyle = (fieldName: string) => ({
    ...styles.input,
    ...(fieldErrors.includes(fieldName) ? styles.inputError : {})
  })

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Yedidim Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img
            src="/yedidim-logo.png"
            alt="ידידים סיוע בדרכים"
            style={{ height: '60px', width: 'auto', display: 'block' }}
          />
        </div>
        <h1 style={{...styles.title, textAlign: 'center'}}>השאלת גלגל - {station.name}</h1>
        <p style={{...styles.subtitle, textAlign: 'center'}}>טופס להשאלת גלגל מתחנת השאלת גלגלים</p>

        {/* Intro text */}
        <div style={styles.infoBox}>
          <p>עמותת ידידים סיוע בדרכים סניף {station.name} מאפשרת לשאול גלגלים לפרק זמן מוגבל על מנת לעזור במקרים בהם אין פנצ'ריות פתוחות, ולא ניתן לבצע תיקון זמני.</p>
          <p style={{ marginTop: '10px' }}>אנו מבקשים להחזיר את הגלגל בהקדם האפשרי ועד 72 שעות ממועד ההשאלה, על מנת שנוכל להמשיך ולסייע לאנשים נוספים.</p>
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
              onChange={e => { setFirstName(e.target.value); setFieldErrors(f => f.filter(x => x !== 'firstName')) }}
              placeholder="ישראל"
              style={getInputStyle('firstName')}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>שם משפחה <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={lastName}
              onChange={e => { setLastName(e.target.value); setFieldErrors(f => f.filter(x => x !== 'lastName')) }}
              placeholder="ישראלי"
              style={getInputStyle('lastName')}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>תעודת זהות <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={idNumber}
            onChange={e => { setIdNumber(e.target.value); setFieldErrors(f => f.filter(x => x !== 'idNumber')) }}
            placeholder="123456789"
            maxLength={9}
            style={getInputStyle('idNumber')}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>טלפון <span style={styles.required}>*</span></label>
          <input
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setFieldErrors(f => f.filter(x => x !== 'phone')) }}
            placeholder="050-1234567"
            style={{
              ...getInputStyle('phone'),
              ...(isPrefilledMode ? { background: '#e2e8f0', cursor: 'not-allowed' } : {})
            }}
            disabled={isPrefilledMode}
          />
          {isPrefilledMode && (
            <span style={styles.helpText}>🔒 מספר הטלפון הוגדר מראש על ידי מנהל התחנה</span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>כתובת מגורים <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={address}
            onChange={e => { setAddress(e.target.value); setFieldErrors(f => f.filter(x => x !== 'address')) }}
            placeholder="רחוב הרצל 1, ירושלים"
            style={getInputStyle('address')}
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
          <label style={styles.label}>בחר גלגל <span style={styles.required}>*</span></label>
          <select
            value={selectedWheelId}
            onChange={e => { setSelectedWheelId(e.target.value); setFieldErrors(f => f.filter(x => x !== 'wheelId')) }}
            style={{
              ...getInputStyle('wheelId'),
              ...(isPrefilledMode && selectedWheelId ? { background: '#e2e8f0', cursor: 'not-allowed' } : {})
            }}
            disabled={isPrefilledMode && !!selectedWheelId}
          >
            <option value="">-- בחר גלגל --</option>
            {wheels.map(wheel => (
              <option key={wheel.id} value={wheel.id}>
                גלגל #{wheel.wheel_number} ┃ {wheel.bolt_count}×{wheel.bolt_spacing} ┃ "{wheel.rim_size}{wheel.is_donut ? ' ┃ דונאט' : ''}
              </option>
            ))}
          </select>
          {isPrefilledMode && selectedWheelId && (
            <span style={styles.helpText}>🔒 הגלגל נבחר מראש על ידי מנהל התחנה</span>
          )}
          {/* Show selected wheel details as badges */}
          {selectedWheelId && (() => {
            const wheel = wheels.find(w => w.id === selectedWheelId)
            if (!wheel) return null
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                <span style={styles.badge}>{wheel.bolt_count}×{wheel.bolt_spacing}</span>
                <span style={styles.badge}>"{wheel.rim_size}</span>
                {wheel.is_donut && <span style={{...styles.badge, background: '#fef3c7', color: '#92400e'}}>דונאט</span>}
                {wheel.notes && <span style={{...styles.badge, background: '#f3f4f6', color: '#374151'}}>{wheel.notes}</span>}
              </div>
            )
          })()}
          {wheels.length === 0 && (
            <p style={{ ...styles.helpText, color: '#ef4444' }}>אין גלגלים זמינים כרגע בתחנה זו</p>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>דגם הרכב <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={vehicleModel}
            onChange={e => { setVehicleModel(e.target.value); setFieldErrors(f => f.filter(x => x !== 'vehicleModel')) }}
            placeholder="יונדאי i25"
            style={getInputStyle('vehicleModel')}
          />
        </div>

        {/* Deposit Section */}
        <div style={styles.sectionTitle}>פיקדון</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>אופן תשלום הפיקדון <span style={styles.required}>*</span></label>
          <div style={{
            ...styles.radioGroup,
            ...(fieldErrors.includes('depositType') ? styles.radioGroupError : {})
          }}>
            {/* Cash */}
            {(station.payment_methods?.cash !== false) && (
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="deposit"
                  value="cash"
                  checked={depositType === 'cash'}
                  onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                />
                <span>💵 ₪{station.deposit_amount || 200} מזומן</span>
              </label>
            )}

            {/* Bit */}
            {station.payment_methods?.bit?.enabled && station.payment_methods.bit.phone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.radioOption}>
                  <input
                    type="radio"
                    name="deposit"
                    value="bit"
                    checked={depositType === 'bit'}
                    onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                  />
                  <span>📱 ₪{station.deposit_amount || 200} בביט ל-{station.payment_methods.bit.phone}</span>
                </label>
                {depositType === 'bit' && (
                  <div style={{ marginRight: '26px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.paymentInfo}>
                      <strong>מספר לתשלום:</strong> {station.payment_methods.bit.phone}<br/>
                      <strong>סכום:</strong> ₪{station.deposit_amount || 200}
                    </div>
                    <a
                      href={`bit://pay?phone=${station.payment_methods.bit.phone.replace(/\D/g, '')}`}
                      style={styles.paymentLink}
                    >
                      פתח אפליקציית ביט ←
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const phoneNumber = station.payment_methods?.bit?.phone?.replace(/\D/g, '') || ''
                        navigator.clipboard.writeText(phoneNumber)
                        toast.success('מספר הטלפון הועתק!')
                      }}
                      style={styles.copyBtn}
                    >
                      📋 העתק מספר טלפון
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Paybox */}
            {station.payment_methods?.paybox?.enabled && station.payment_methods.paybox.phone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.radioOption}>
                  <input
                    type="radio"
                    name="deposit"
                    value="paybox"
                    checked={depositType === 'paybox'}
                    onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                  />
                  <span>📦 ₪{station.deposit_amount || 200} בפייבוקס ל-{station.payment_methods.paybox.phone}</span>
                </label>
                {depositType === 'paybox' && (
                  <div style={{ marginRight: '26px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.paymentInfo}>
                      <strong>מספר לתשלום:</strong> {station.payment_methods.paybox.phone}<br/>
                      <strong>סכום:</strong> ₪{station.deposit_amount || 200}<br/>
                      <span style={{ color: '#f59e0b', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                        ⚠️ אפליקציית PayBox לא תומכת בפתיחה אוטומטית מטעמי אבטחה. יש לפתוח את האפליקציה באופן ידני.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const phoneNumber = station.payment_methods?.paybox?.phone?.replace(/\D/g, '') || ''
                        navigator.clipboard.writeText(phoneNumber)
                        toast.success('מספר הטלפון הועתק!')
                      }}
                      style={styles.copyBtn}
                    >
                      📋 העתק מספר טלפון
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bank Transfer */}
            {station.payment_methods?.bank_transfer?.enabled && station.payment_methods.bank_transfer.details && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.radioOption}>
                  <input
                    type="radio"
                    name="deposit"
                    value="bank_transfer"
                    checked={depositType === 'bank_transfer'}
                    onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                  />
                  <span>🏦 ₪{station.deposit_amount || 200} העברה בנקאית</span>
                </label>
                {depositType === 'bank_transfer' && (
                  <div style={styles.bankDetails}>
                    <strong>פרטי חשבון:</strong><br />
                    {station.payment_methods.bank_transfer.details}
                  </div>
                )}
              </div>
            )}

            {/* ID Deposit */}
            {(station.payment_methods?.id_deposit !== false) && (
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="deposit"
                  value="id"
                  checked={depositType === 'id'}
                  onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                />
                <span>🪪 פיקדון תעודת זהות (באישור מנהל)</span>
              </label>
            )}

            {/* License Deposit */}
            {(station.payment_methods?.license_deposit !== false) && (
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="deposit"
                  value="license"
                  checked={depositType === 'license'}
                  onChange={e => { setDepositType(e.target.value); setFieldErrors(f => f.filter(x => x !== 'depositType')) }}
                />
                <span>🚗 פיקדון רישיון נהיגה (באישור מנהל)</span>
              </label>
            )}
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

        <div
          ref={termsRef}
          style={{
            ...styles.terms,
            ...(fieldErrors.includes('terms') ? styles.termsError : {})
          }}
          onScroll={handleTermsScroll}
        >
          <p><strong>תקנון השאלת גלגל:</strong></p>
          <ol style={styles.termsList}>
            <li>הפונה מתחייב להחזיר את הגלגל בתוך <strong>72 שעות</strong>, ולהשאיר כפקדון {station.deposit_amount || 200} ש"ח באמצעי התשלום הזמין.</li>
            <li>הפונה יקבל חזרה את הפקדון בעת החזרת הגלגל. במידה והגלגל לא יוחזר בתוך 72 שעות, סכום הכסף יועבר כתרומה לידידים.</li>
            <li><strong>הפונה מבין שזהו תיקון חירום בלבד!</strong> והגלגל עשוי להיות במידה מעט שונה/לפגוע ביציבות הרכב ולכן מתחייב לא לנהוג במהירות מעל 80 קמ"ש וכן שלא תהיה לו שום תלונה על הסיוע שקיבל.</li>
            <li>במקרים חריגים ניתן להאריך את זמן ההשאלה עד 5 ימים, באישור מנהל התחנה או סג"מ התחנה.</li>
            <li>במקרים חריגים (באישור מנהל/סג"מ התחנה) ניתן להפקיד כערבון תעודה מזהה במקום פקדון כספי.</li>
          </ol>
          {!canAgreeTerms && (
            <p style={styles.scrollHint}>👇 גלול למטה כדי להמשיך</p>
          )}
        </div>

        <label style={{
          ...styles.checkboxRow,
          ...(fieldErrors.includes('terms') ? styles.checkboxRowError : {}),
          ...(!canAgreeTerms ? styles.checkboxDisabled : {})
        }}>
          <input
            type="checkbox"
            checked={agreedTerms}
            disabled={!canAgreeTerms}
            onChange={e => { setAgreedTerms(e.target.checked); setFieldErrors(f => f.filter(x => x !== 'terms')) }}
          />
          <span>קראתי את התנאים ואני מסכים/ה להם <span style={styles.required}>*</span></span>
        </label>

        {/* Signature */}
        <div style={styles.formGroup}>
          <label style={styles.label}>חתימה <span style={styles.required}>*</span></label>
          <div style={{
            ...styles.signatureContainer,
            ...(hasSigned ? styles.signatureSigned : {}),
            ...(fieldErrors.includes('signature') ? styles.signatureError : {})
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
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); startDrawing(e) }}
              onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); draw(e) }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); stopDrawing() }}
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

// Wrapper component to handle async params
export default function SignFormPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params)

  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <p>טוען...</p>
      </div>
    }>
      <SignFormContent stationId={stationId} />
    </Suspense>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f3f4f6',
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
    color: '#374151',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(0,0,0,0.1)',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  spinnerEmoji: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#374151',
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    marginTop: '20px',
    display: 'inline-block',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '15px',
  },
  title: {
    color: '#1f2937',
    fontSize: '1.5rem',
    marginBottom: '5px',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#1e40af',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  link: {
    color: '#3b82f6',
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '20px',
    marginBottom: '15px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
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
    color: '#374151',
    fontSize: '0.9rem',
    marginBottom: '5px',
    fontWeight: 500,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#1f2937',
    fontSize: '1rem',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: '2px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#1f2937',
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
  radioGroupError: {
    padding: '10px',
    borderRadius: '8px',
    border: '2px solid #ef4444',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#1f2937',
    border: '1px solid #e5e7eb',
  },
  terms: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    maxHeight: '200px',
    overflowY: 'auto',
    color: '#374151',
    fontSize: '0.9rem',
    border: '1px solid #e5e7eb',
  },
  termsError: {
    borderColor: '#ef4444',
    borderWidth: '2px',
  },
  termsList: {
    paddingRight: '20px',
    marginTop: '10px',
  },
  scrollHint: {
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: '10px',
    fontWeight: 500,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '20px',
    cursor: 'pointer',
    color: '#1f2937',
  },
  checkboxRowError: {
    color: '#ef4444',
  },
  checkboxDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
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
    borderColor: '#3b82f6',
    background: '#fff',
  },
  signatureError: {
    borderColor: '#ef4444',
    borderWidth: '2px',
  },
  signaturePlaceholder: {
    color: '#9ca3af',
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
    touchAction: 'none',
  },
  clearBtn: {
    marginTop: '10px',
    padding: '8px 16px',
    background: '#e5e7eb',
    color: '#374151',
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
    background: '#fff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  successIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  successTitle: {
    color: '#1f2937',
    fontSize: '1.3rem',
    marginBottom: '15px',
  },
  successText: {
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: 1.6,
  },
  warningBox: {
    background: '#fffbeb',
    color: '#b45309',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fcd34d',
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
  paymentLink: {
    display: 'inline-block',
    marginRight: '26px',
    padding: '10px 16px',
    background: '#3b82f6',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'center',
  },
  bankDetails: {
    marginRight: '26px',
    padding: '12px',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#374151',
    whiteSpace: 'pre-wrap',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  paymentInfo: {
    padding: '12px',
    background: '#f0fdf4',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#166534',
    border: '1px solid #bbf7d0',
  },
  copyBtn: {
    padding: '10px 16px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
}
