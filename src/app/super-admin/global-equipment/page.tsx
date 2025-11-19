'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { GlobalEquipmentPool, EquipmentCategory } from '@/types'
import Logo from '@/components/Logo'
import { checkAuth, logout } from '@/lib/auth'

export default function GlobalEquipmentPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Equipment state
  const [equipment, setEquipment] = useState<GlobalEquipmentPool[]>([])
  const [pendingEquipment, setPendingEquipment] = useState<GlobalEquipmentPool[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [loading, setLoading] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active')
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<GlobalEquipmentPool | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Form state
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    image_url: '',
    category_id: ''
  })

  // Check authentication
  useEffect(() => {
    const verifyAuth = async () => {
      const { authenticated, userType, user } = await checkAuth()
      if (authenticated && userType === 'super') {
        setIsAuthenticated(true)
        setCurrentUser(user)
      } else {
        router.push('/super-admin')
      }
      setIsCheckingAuth(false)
    }
    verifyAuth()
  }, [router])

  // Fetch data
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories()
      fetchEquipment()
    }
  }, [isAuthenticated])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      // Fetch active equipment
      const activeResponse = await fetch('/api/global-equipment?status=active&includeCategories=true')
      const activeData = await activeResponse.json()
      setEquipment(activeData.equipment || [])

      // Fetch pending equipment
      const pendingResponse = await fetch('/api/global-equipment?status=pending_approval&includeCategories=true')
      const pendingData = await pendingResponse.json()
      setPendingEquipment(pendingData.equipment || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
      alert('שגיאה בטעינת הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/global-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipmentForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת ציוד')
      }

      alert(data.message || 'הפריט נוסף בהצלחה')
      setShowAddEquipment(false)
      setEquipmentForm({ name: '', image_url: '', category_id: '' })
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEquipment) return

    setLoading(true)

    try {
      const response = await fetch('/api/global-equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEquipment.id,
          ...equipmentForm
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעדכון ציוד')
      }

      alert('הפריט עודכן בהצלחה')
      setEditingEquipment(null)
      setEquipmentForm({ name: '', image_url: '', category_id: '' })
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את "${name}"? הפריט יוסר מכל הערים!`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/global-equipment?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במחיקת ציוד')
      }

      alert(data.message)
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveEquipment = async (id: string, name: string) => {
    setLoading(true)

    try {
      const response = await fetch('/api/global-equipment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: id, action: 'approve' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באישור ציוד')
      }

      alert(data.message)
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectEquipment = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך לדחות את "${name}"?`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/global-equipment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: id, action: 'reject' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בדחיית ציוד')
      }

      alert(data.message)
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (item: GlobalEquipmentPool) => {
    setEditingEquipment(item)
    setEquipmentForm({
      name: item.name,
      image_url: item.image_url || '',
      category_id: item.category_id || ''
    })
    setShowAddEquipment(true)
  }

  const cancelEdit = () => {
    setEditingEquipment(null)
    setEquipmentForm({ name: '', image_url: '', category_id: '' })
    setShowAddEquipment(false)
  }

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredPendingEquipment = pendingEquipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Count cities using each equipment
  const [equipmentUsageCount, setEquipmentUsageCount] = useState<Record<string, number>>({})

  useEffect(() => {
    if (equipment.length > 0) {
      fetchEquipmentUsageCount()
    }
  }, [equipment])

  const fetchEquipmentUsageCount = async () => {
    try {
      const equipmentIds = equipment.map(e => e.id)
      const { data, error } = await supabase
        .from('city_equipment')
        .select('global_equipment_id')

      if (!error && data) {
        const counts: Record<string, number> = {}
        data.forEach(item => {
          counts[item.global_equipment_id] = (counts[item.global_equipment_id] || 0) + 1
        })
        setEquipmentUsageCount(counts)
      }
    } catch (error) {
      console.error('Error fetching usage count:', error)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Logo size="large" />
          <p className="text-gray-600 mt-4">טוען...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Logo size="medium" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">ניהול מאגר ציוד גלובלי</h1>
                <p className="text-gray-600">ניהול הציוד הגלובלי עבור כל הערים</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/super-admin">
                <Button variant="outline">חזרה לניהול ראשי</Button>
              </Link>
              <Button variant="destructive" onClick={() => logout(router)}>
                התנתק
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}
            onClick={() => setActiveTab('active')}
          >
            ציוד פעיל ({equipment.length})
          </Button>
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={pendingEquipment.length > 0 ? 'relative' : ''}
          >
            ממתינים לאישור ({pendingEquipment.length})
            {pendingEquipment.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingEquipment.length}
              </span>
            )}
          </Button>
        </div>

        {/* Active Equipment Tab */}
        {activeTab === 'active' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>מאגר הציוד הגלובלי</CardTitle>
                  <CardDescription>ניהול כל הציוד הזמין במערכת</CardDescription>
                </div>
                <Button onClick={() => setShowAddEquipment(!showAddEquipment)}>
                  {showAddEquipment ? 'ביטול' : '+ הוסף ציוד חדש'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add/Edit Form */}
              {showAddEquipment && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-4">
                    {editingEquipment ? 'עריכת ציוד' : 'הוספת ציוד חדש'}
                  </h3>
                  <form onSubmit={editingEquipment ? handleUpdateEquipment : handleAddEquipment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">שם הציוד *</label>
                      <Input
                        value={equipmentForm.name}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                        placeholder="למשל: בורג סיליקון גדול"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">קטגוריה</label>
                      <select
                        value={equipmentForm.category_id}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, category_id: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">ללא קטגוריה</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">תמונה (URL או Emoji)</label>
                      <Input
                        value={equipmentForm.image_url}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, image_url: e.target.value })}
                        placeholder="🔧 או https://..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        {editingEquipment ? 'עדכן' : 'הוסף'}
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        ביטול
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="חיפוש ציוד..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="all">כל הקטגוריות</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Equipment List */}
              {loading ? (
                <p className="text-center text-gray-500">טוען...</p>
              ) : filteredEquipment.length === 0 ? (
                <p className="text-center text-gray-500">אין ציוד במאגר</p>
              ) : (
                <div className="space-y-2">
                  {filteredEquipment.map(item => {
                    const category = categories.find(c => c.id === item.category_id)
                    const usageCount = equipmentUsageCount[item.id] || 0

                    return (
                      <div key={item.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          {item.image_url && (
                            <div className="text-4xl">
                              {item.image_url.startsWith('http') ? (
                                <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <span>{item.image_url}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              {category?.name || 'ללא קטגוריה'} • {usageCount} ערים משתמשות
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                            ערוך
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteEquipment(item.id, item.name)}
                          >
                            מחק
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Equipment Tab */}
        {activeTab === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle>בקשות ממתינות לאישור</CardTitle>
              <CardDescription>פריטי ציוד שמנהלי ערים הוסיפו וממתינים לאישורך</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-500">טוען...</p>
              ) : filteredPendingEquipment.length === 0 ? (
                <p className="text-center text-gray-500">אין בקשות ממתינות</p>
              ) : (
                <div className="space-y-2">
                  {filteredPendingEquipment.map(item => {
                    const category = categories.find(c => c.id === item.category_id)

                    return (
                      <div key={item.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-yellow-50">
                        <div className="flex items-center gap-4">
                          {item.image_url && (
                            <div className="text-4xl">
                              {item.image_url.startsWith('http') ? (
                                <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <span>{item.image_url}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              {category?.name || 'ללא קטגוריה'}
                            </p>
                            <p className="text-xs text-gray-500">
                              נוצר ב-{new Date(item.created_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveEquipment(item.id, item.name)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            ✓ אשר
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectEquipment(item.id, item.name)}
                          >
                            ✗ דחה
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
