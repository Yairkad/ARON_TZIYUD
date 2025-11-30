'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface SuperAdmin {
  id: string
  email: string
  full_name: string
  phone?: string
  is_active: boolean
  created_at: string
}

export default function MasterAdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [masterPassword, setMasterPassword] = useState('')
  const [showLogin, setShowLogin] = useState(true)

  // Super admins state
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null)

  // Form state
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  })

  // Check if already authenticated via session
  useEffect(() => {
    checkMasterAuth()
  }, [])

  const checkMasterAuth = async () => {
    try {
      const response = await fetch('/api/master-admin/auth', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setShowLogin(false)
        fetchSuperAdmins()
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/master-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: masterPassword }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsAuthenticated(true)
        setShowLogin(false)
        toast.success('התחברות הצליחה')
        fetchSuperAdmins()
      } else {
        toast.error(data.error || 'סיסמה שגויה')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/master-admin/auth', {
        method: 'DELETE',
        credentials: 'include',
      })
      setIsAuthenticated(false)
      setShowLogin(true)
      setSuperAdmins([])
      setMasterPassword('')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fetchSuperAdmins = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/master-admin/super-admins', {
        credentials: 'include',
      })
      const data = await response.json()

      if (response.ok) {
        setSuperAdmins(data.admins || [])
      } else {
        toast.error(data.error || 'שגיאה בטעינת הנתונים')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email || !form.password || !form.full_name) {
      toast.error('יש למלא את כל השדות החובה')
      return
    }

    if (form.password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('סופר-אדמין נוצר בהצלחה!')
        setForm({ email: '', password: '', full_name: '', phone: '' })
        setShowAddForm(false)
        fetchSuperAdmins()
      } else {
        toast.error(data.error || 'שגיאה ביצירת המשתמש')
      }
    } catch (error) {
      console.error('Create error:', error)
      toast.error('שגיאה ביצירת המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return

    if (!form.email || !form.full_name) {
      toast.error('יש למלא את כל השדות החובה')
      return
    }

    if (form.password && form.password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-admin/super-admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingAdmin.id,
          ...form,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('סופר-אדמין עודכן בהצלחה!')
        setForm({ email: '', password: '', full_name: '', phone: '' })
        setEditingAdmin(null)
        fetchSuperAdmins()
      } else {
        toast.error(data.error || 'שגיאה בעדכון המשתמש')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('שגיאה בעדכון המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (admin: SuperAdmin) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${admin.full_name}?`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/master-admin/super-admins?id=${admin.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('סופר-אדמין נמחק בהצלחה')
        fetchSuperAdmins()
      } else {
        toast.error(data.error || 'שגיאה במחיקת המשתמש')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('שגיאה במחיקת המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (admin: SuperAdmin) => {
    const action = admin.is_active ? 'לחסום' : 'להפעיל'
    if (!confirm(`האם ${action} את ${admin.full_name}?`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/master-admin/super-admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: admin.id,
          is_active: !admin.is_active,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`המשתמש ${admin.is_active ? 'נחסם' : 'הופעל'} בהצלחה`)
        fetchSuperAdmins()
      } else {
        toast.error(data.error || 'שגיאה בעדכון המשתמש')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('שגיאה בעדכון המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (admin: SuperAdmin) => {
    setEditingAdmin(admin)
    setForm({
      email: admin.email,
      password: '',
      full_name: admin.full_name,
      phone: admin.phone || '',
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingAdmin(null)
    setShowAddForm(false)
    setForm({ email: '', password: '', full_name: '', phone: '' })
  }

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400"></div>
      </div>
    )
  }

  // Login screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-slate-800/90 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="text-6xl mb-4">🔐</div>
            <CardTitle className="text-2xl font-bold text-white">Master Admin</CardTitle>
            <CardDescription className="text-gray-400">
              גישה מוגבלת - ניהול סופר-אדמינים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMasterLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  סיסמת מאסטר
                </label>
                <Input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="הזן סיסמת מאסטר"
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                {loading ? '⏳ מתחבר...' : '🔓 כניסה'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main admin panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">👑</span>
              ניהול סופר-אדמינים
            </h1>
            <p className="text-gray-400 mt-1">יצירה, עריכה ומחיקה של מנהלים ראשיים</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            🚪 התנתק
          </Button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingAdmin) && (
          <Card className="border-0 shadow-xl bg-slate-800/80 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-white">
                {editingAdmin ? '✏️ עריכת סופר-אדמין' : '➕ הוספת סופר-אדמין חדש'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      👤 שם מלא <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="שם מלא"
                      className="h-11 bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      📧 מייל <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                      className="h-11 bg-slate-700 border-slate-600 text-white"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      🔑 סיסמה {editingAdmin ? '(השאר ריק אם לא לשנות)' : <span className="text-red-400">*</span>}
                    </label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingAdmin ? 'סיסמה חדשה (אופציונלי)' : 'סיסמה'}
                      className="h-11 bg-slate-700 border-slate-600 text-white"
                      required={!editingAdmin}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      📱 טלפון
                    </label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      className="h-11 bg-slate-700 border-slate-600 text-white"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                  >
                    {loading ? '⏳ שומר...' : editingAdmin ? '✅ עדכן' : '✅ צור'}
                  </Button>
                  <Button
                    type="button"
                    onClick={cancelEdit}
                    variant="outline"
                    className="flex-1 h-11 border-gray-600 text-gray-300 hover:bg-slate-700"
                  >
                    ❌ ביטול
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Add button */}
        {!showAddForm && !editingAdmin && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg"
          >
            ➕ הוסף סופר-אדמין חדש
          </Button>
        )}

        {/* Admins List */}
        <Card className="border-0 shadow-xl bg-slate-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              👑 רשימת סופר-אדמינים
              <span className="bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
                {superAdmins.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && superAdmins.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                <p className="text-gray-400 mt-4">טוען...</p>
              </div>
            ) : superAdmins.length === 0 ? (
              <div className="text-center py-12 bg-slate-700/50 rounded-xl">
                <span className="text-6xl mb-4 block">👑</span>
                <p className="text-gray-400 text-lg">אין סופר-אדמינים עדיין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {superAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className={`bg-gradient-to-r ${admin.is_active ? 'from-slate-700/80 to-purple-900/30' : 'from-red-900/30 to-slate-700/80'} rounded-xl p-4 border border-slate-600`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">👑</span>
                        <div>
                          <h3 className="text-lg font-bold text-white">{admin.full_name}</h3>
                          <p className="text-sm text-gray-400">{admin.email}</p>
                          {admin.phone && (
                            <p className="text-xs text-gray-500">📱 {admin.phone}</p>
                          )}
                        </div>
                        {!admin.is_active && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">מושבת</span>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => startEdit(admin)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          disabled={loading}
                        >
                          ✏️ ערוך
                        </Button>
                        <Button
                          onClick={() => handleToggleActive(admin)}
                          className={admin.is_active
                            ? 'bg-amber-600 hover:bg-amber-700 text-white text-sm'
                            : 'bg-green-600 hover:bg-green-700 text-white text-sm'
                          }
                          disabled={loading}
                        >
                          {admin.is_active ? '🚫 חסום' : '✅ הפעל'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteAdmin(admin)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm"
                          disabled={loading}
                        >
                          🗑️ מחק
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>🔒 גישה מאובטחת - Master Admin Panel</p>
        </div>
      </div>
    </div>
  )
}
