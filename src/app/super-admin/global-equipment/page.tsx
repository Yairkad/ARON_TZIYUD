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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Logo />
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header - Fixed on mobile */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">ניהול מאגר ציוד</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">ניהול הציוד הגלובלי עבור כל הערים</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/super-admin" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm">
                  חזרה
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 sm:flex-none text-sm"
                onClick={async () => {
                  await logout()
                  router.push('/super-admin')
                }}
              >
                התנתק
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{equipment.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">פריטים פעילים</div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">{pendingEquipment.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">ממתינים לאישור</div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{categories.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">קטגוריות</div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">
              {Object.values(equipmentUsageCount).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">שימושים בערים</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            ציוד פעיל ({equipment.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            ממתינים ({pendingEquipment.length})
            {pendingEquipment.length > 0 && activeTab !== 'pending' && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {pendingEquipment.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Equipment Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {/* Add Equipment Button - Floating on mobile */}
            <div className="fixed bottom-4 left-4 right-4 sm:relative sm:bottom-auto sm:left-auto sm:right-auto z-40 sm:z-auto">
              <Button
                onClick={() => setShowAddEquipment(!showAddEquipment)}
                className={`w-full sm:w-auto shadow-lg sm:shadow-none ${
                  showAddEquipment ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                size="lg"
              >
                {showAddEquipment ? 'ביטול' : '+ הוסף ציוד חדש'}
              </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddEquipment && (
              <Card className="border-blue-200 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {editingEquipment ? 'עריכת ציוד' : 'הוספת ציוד חדש'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={editingEquipment ? handleUpdateEquipment : handleAddEquipment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">שם הציוד *</label>
                      <Input
                        value={equipmentForm.name}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                        placeholder="למשל: בורג סיליקון גדול"
                        required
                        className="text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">קטגוריה</label>
                      <select
                        value={equipmentForm.category_id}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, category_id: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">ללא קטגוריה</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">תמונה (URL או Emoji)</label>
                      <Input
                        value={equipmentForm.image_url}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-base"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                        {loading ? 'שומר...' : editingEquipment ? 'עדכן' : 'הוסף'}
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1 sm:flex-none">
                        ביטול
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="חיפוש ציוד..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="all">כל הקטגוריות</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-gray-500">אין ציוד במאגר</p>
                  <p className="text-sm text-gray-400 mt-1">לחץ על "הוסף ציוד חדש" להתחלה</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 sm:pb-4">
                {filteredEquipment.map(item => {
                  const category = categories.find(c => c.id === item.category_id)
                  const usageCount = equipmentUsageCount[item.id] || 0

                  return (
                    <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex items-start p-3 sm:p-4 gap-3">
                          {/* Image/Emoji */}
                          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                            {item.image_url ? (
                              item.image_url.startsWith('http') ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-2xl sm:text-3xl">{item.image_url}</span>
                              )
                            ) : (
                              <span className="text-2xl text-gray-400">📦</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                {category?.name || 'ללא קטגוריה'}
                              </span>
                              {usageCount > 0 && (
                                <span className="text-xs text-green-600 font-medium">
                                  {usageCount} ערים
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex border-t border-gray-100">
                          <button
                            onClick={() => startEdit(item)}
                            className="flex-1 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                          >
                            ערוך
                          </button>
                          <div className="w-px bg-gray-100"></div>
                          <button
                            onClick={() => handleDeleteEquipment(item.id, item.name)}
                            className="flex-1 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            מחק
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Equipment Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">בקשות ממתינות לאישור</CardTitle>
                <CardDescription className="text-sm">
                  פריטי ציוד שמנהלי ערים הוסיפו וממתינים לאישורך
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                ) : filteredPendingEquipment.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-gray-500">אין בקשות ממתינות</p>
                    <p className="text-sm text-gray-400 mt-1">כל הבקשות טופלו</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPendingEquipment.map(item => {
                      const category = categories.find(c => c.id === item.category_id)

                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl"
                        >
                          <div className="flex items-start gap-3">
                            {/* Image/Emoji */}
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-amber-200">
                              {item.image_url ? (
                                item.image_url.startsWith('http') ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <span className="text-2xl">{item.image_url}</span>
                                )
                              ) : (
                                <span className="text-2xl text-gray-400">📦</span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-800">
                                {item.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white text-gray-600 border border-gray-200">
                                  {category?.name || 'ללא קטגוריה'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(item.created_at).toLocaleDateString('he-IL')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleApproveEquipment(item.id, item.name)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✓ אשר
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectEquipment(item.id, item.name)}
                              className="flex-1"
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
          </div>
        )}
      </main>
    </div>
  )
}
