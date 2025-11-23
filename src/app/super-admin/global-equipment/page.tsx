'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { GlobalEquipmentPool, EquipmentCategory } from '@/types'
import Logo from '@/components/Logo'
import { checkAuth } from '@/lib/auth'

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
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'categories'>('active')
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<GlobalEquipmentPool | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    image_url: '',
    display_order: 0
  })

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')

  // Refs for scrolling to edit form
  const editFormRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Form state
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    image_url: '',
    category_id: ''
  })

  // City list popup state
  const [showCityList, setShowCityList] = useState(false)
  const [selectedEquipmentForCities, setSelectedEquipmentForCities] = useState<GlobalEquipmentPool | null>(null)
  const [citiesUsingEquipment, setCitiesUsingEquipment] = useState<{id: string, name: string}[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSource, setMergeSource] = useState<GlobalEquipmentPool | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string>('')

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
      // Fetch active and pending equipment in parallel for better performance
      const [activeResponse, pendingResponse] = await Promise.all([
        fetch('/api/global-equipment?status=active&includeCategories=true'),
        fetch('/api/global-equipment?status=pending_approval&includeCategories=true')
      ])

      const [activeData, pendingData] = await Promise.all([
        activeResponse.json(),
        pendingResponse.json()
      ])

      setEquipment(activeData.equipment || [])
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
      setEditingItemId(null)
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
    setEditingItemId(item.id)
    setEquipmentForm({
      name: item.name,
      image_url: item.image_url || '',
      category_id: item.category_id || ''
    })
    setShowAddEquipment(false)
  }

  const cancelEdit = () => {
    setEditingEquipment(null)
    setEditingItemId(null)
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

  // Fetch cities using specific equipment
  const fetchCitiesUsingEquipment = async (equipmentId: string) => {
    setLoadingCities(true)
    try {
      const { data, error } = await supabase
        .from('city_equipment')
        .select('city_id, cities(id, name)')
        .eq('global_equipment_id', equipmentId)

      if (!error && data) {
        const cities = data
          .map((item: any) => item.cities)
          .filter(Boolean)
          .map((city: any) => ({ id: city.id, name: city.name }))
        setCitiesUsingEquipment(cities)
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    } finally {
      setLoadingCities(false)
    }
  }

  const showCitiesPopup = (item: GlobalEquipmentPool) => {
    setSelectedEquipmentForCities(item)
    fetchCitiesUsingEquipment(item.id)
    setShowCityList(true)
  }

  // Merge equipment
  const handleMergeEquipment = async () => {
    if (!mergeSource || !mergeTarget || mergeSource.id === mergeTarget) {
      alert('יש לבחור פריט יעד שונה מהמקור')
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למזג את "${mergeSource.name}" לתוך הפריט הנבחר? כל הערים שמשתמשות בפריט זה יעודכנו לפריט החדש והפריט הישן יימחק.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/global-equipment/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: mergeSource.id,
          targetId: mergeTarget
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במיזוג הפריטים')
      }

      alert(data.message || 'הפריטים מוזגו בהצלחה')
      setShowMergeModal(false)
      setMergeSource(null)
      setMergeTarget('')
      fetchEquipment()
    } catch (error: any) {
      console.error('Error merging equipment:', error)
      alert('שגיאה במיזוג הפריטים: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const startMerge = (item: GlobalEquipmentPool) => {
    setMergeSource(item)
    setMergeTarget('')
    setShowMergeModal(true)
  }

  // Category management functions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת קטגוריה')
      }

      alert(data.message || 'הקטגוריה נוספה בהצלחה')
      setShowAddCategory(false)
      setCategoryForm({ name: '', icon: '', image_url: '', display_order: 0 })
      fetchCategories()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    setLoading(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          ...categoryForm
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעדכון קטגוריה')
      }

      alert('הקטגוריה עודכנה בהצלחה')
      setEditingCategory(null)
      setCategoryForm({ name: '', icon: '', image_url: '', display_order: 0 })
      fetchCategories()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקטגוריה "${name}"?`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במחיקת קטגוריה')
      }

      alert(data.message)
      fetchCategories()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditCategory = (cat: EquipmentCategory) => {
    setEditingCategory(cat)
    setCategoryForm({
      name: cat.name,
      icon: cat.icon || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order || 0
    })
    setShowAddCategory(false)
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', icon: '', image_url: '', display_order: 0 })
    setShowAddCategory(false)
  }

  // Bulk assign functions
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const selectAllItems = () => {
    if (selectedItems.length === filteredEquipment.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredEquipment.map(e => e.id))
    }
  }

  const handleBulkAssign = async () => {
    if (selectedItems.length === 0) {
      alert('יש לבחור לפחות פריט אחד')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/categories/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_ids: selectedItems,
          category_id: bulkCategoryId || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשיוך הפריטים')
      }

      alert(data.message)
      setShowBulkAssign(false)
      setSelectedItems([])
      setBulkCategoryId('')
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Count equipment per category
  const getCategoryEquipmentCount = (categoryId: string) => {
    return equipment.filter(e => e.category_id === categoryId).length
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
      {/* Header - Centered logo with subtitle */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button - left side */}
            <Link href="/super-admin">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>

            {/* Centered logo and title */}
            <div className="flex flex-col items-center">
              <Logo />
              <h1 className="text-sm font-medium text-gray-600 mt-1">ניהול מאגר</h1>
            </div>

            {/* Empty space for balance */}
            <div className="w-9"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-24">
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
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'categories'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            קטגוריות ({categories.length})
          </button>
        </div>

        {/* Active Equipment Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {/* Add Form (when adding new) */}
            {showAddEquipment && !editingEquipment && (
              <Card className="border-blue-200 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">הוספת ציוד חדש</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddEquipment} className="space-y-4">
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
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">תמונה (URL)</label>
                      <Input
                        value={equipmentForm.image_url}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-base"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                        {loading ? 'שומר...' : 'הוסף'}
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
                  <button
                    onClick={selectAllItems}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors bg-white"
                  >
                    {selectedItems.length === filteredEquipment.length && filteredEquipment.length > 0
                      ? 'בטל בחירה'
                      : `בחר הכל (${filteredEquipment.length})`}
                  </button>
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
                  <p className="text-sm text-gray-400 mt-1">לחץ על + להתחלה</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEquipment.map(item => {
                  const category = categories.find(c => c.id === item.category_id)
                  const usageCount = equipmentUsageCount[item.id] || 0
                  const isEditing = editingItemId === item.id

                  return (
                    <div key={item.id} ref={el => { editFormRefs.current[item.id] = el }}>
                      <Card className={`shadow-sm hover:shadow-md transition-shadow overflow-hidden ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
                        <CardContent className="p-0">
                          {isEditing ? (
                            // Inline Edit Form
                            <div className="p-4">
                              <form onSubmit={handleUpdateEquipment} className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">שם הציוד *</label>
                                  <Input
                                    value={equipmentForm.name}
                                    onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                                    required
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">קטגוריה</label>
                                  <select
                                    value={equipmentForm.category_id}
                                    onChange={(e) => setEquipmentForm({ ...equipmentForm, category_id: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">ללא קטגוריה</option>
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">תמונה (URL)</label>
                                  <Input
                                    value={equipmentForm.image_url}
                                    onChange={(e) => setEquipmentForm({ ...equipmentForm, image_url: e.target.value })}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button type="submit" disabled={loading} size="sm" className="flex-1">
                                    {loading ? '...' : 'שמור'}
                                  </Button>
                                  <Button type="button" variant="outline" onClick={cancelEdit} size="sm" className="flex-1">
                                    ביטול
                                  </Button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            // Normal Display
                            <>
                              <div className="flex items-start p-3 sm:p-4 gap-3">
                                {/* Checkbox for bulk selection */}
                                <div className="flex-shrink-0 flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </div>
                                {/* Image/Emoji */}
                                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                                  {item.image_url ? (
                                    item.image_url.startsWith('http') ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded-lg"
                                        loading="lazy"
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
                                      <button
                                        onClick={() => showCitiesPopup(item)}
                                        className="text-xs text-green-600 font-medium hover:text-green-800 hover:underline"
                                      >
                                        {usageCount} ערים
                                      </button>
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
                                  onClick={() => startMerge(item)}
                                  className="flex-1 py-2.5 text-sm text-purple-600 hover:bg-purple-50 transition-colors font-medium"
                                >
                                  מזג
                                </button>
                                <div className="w-px bg-gray-100"></div>
                                <button
                                  onClick={() => handleDeleteEquipment(item.id, item.name)}
                                  className="flex-1 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                >
                                  מחק
                                </button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
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
                                    loading="lazy"
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

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Add Category Form */}
            {(showAddCategory || editingCategory) && (
              <Card className="border-green-200 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">שם הקטגוריה *</label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="למשל: כלי יד"
                        required
                        className="text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">אייקון (אימוג'י)</label>
                      <Input
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                        placeholder="🔧"
                        className="text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">תמונה (URL)</label>
                      <Input
                        value={categoryForm.image_url}
                        onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">סדר תצוגה</label>
                      <Input
                        type="number"
                        value={categoryForm.display_order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                        className="text-base"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={loading} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700">
                        {loading ? 'שומר...' : editingCategory ? 'עדכן' : 'הוסף'}
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEditCategory} className="flex-1 sm:flex-none">
                        ביטול
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Categories List */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">רשימת קטגוריות</CardTitle>
                <CardDescription className="text-sm">
                  נהל את הקטגוריות של מאגר הציוד
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-gray-500">אין קטגוריות</p>
                    <p className="text-sm text-gray-400 mt-1">לחץ על + להוספה</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const equipmentCount = getCategoryEquipmentCount(cat.id)

                      return (
                        <div
                          key={cat.id}
                          className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            {/* Icon/Image */}
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                              {cat.image_url ? (
                                cat.image_url.startsWith('http') ? (
                                  <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    className="w-full h-full object-cover rounded-lg"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="text-2xl">{cat.image_url}</span>
                                )
                              ) : cat.icon ? (
                                <span className="text-2xl">{cat.icon}</span>
                              ) : (
                                <span className="text-2xl text-gray-400">📁</span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-800">
                                {cat.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {equipmentCount} פריטים
                                </span>
                                <span className="text-xs text-gray-400">
                                  סדר: {cat.display_order || 0}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditCategory(cat)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                disabled={equipmentCount > 0}
                                title={equipmentCount > 0 ? 'לא ניתן למחוק קטגוריה עם פריטים' : 'מחק'}
                              >
                                🗑️
                              </button>
                            </div>
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

      {/* Floating Add Button - Circle on bottom left */}
      {activeTab === 'active' && !editingItemId && (
        <button
          onClick={() => {
            setShowAddEquipment(!showAddEquipment)
            if (editingEquipment) {
              cancelEdit()
            }
          }}
          className={`fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-50 transition-all ${
            showAddEquipment
              ? 'bg-gray-500 rotate-45'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
          }`}
        >
          +
        </button>
      )}

      {/* Floating Add Button for Categories */}
      {activeTab === 'categories' && !editingCategory && (
        <button
          onClick={() => {
            setShowAddCategory(!showAddCategory)
          }}
          className={`fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-50 transition-all ${
            showAddCategory
              ? 'bg-gray-500 rotate-45'
              : 'bg-green-600 hover:bg-green-700 hover:scale-110'
          }`}
        >
          +
        </button>
      )}

      {/* Bulk Selection Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3 z-50">
          <span className="text-sm font-medium">{selectedItems.length} נבחרו</span>
          <Button
            size="sm"
            onClick={() => setShowBulkAssign(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            שייך לקטגוריה
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedItems([])}
          >
            בטל
          </Button>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBulkAssign(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">שיוך לקטגוריה</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedItems.length} פריטים נבחרו
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium mb-2">בחר קטגוריה</label>
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">הסר מקטגוריה</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <Button
                onClick={handleBulkAssign}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'משייך...' : 'שייך'}
              </Button>
              <Button variant="outline" onClick={() => setShowBulkAssign(false)} className="flex-1">
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* City List Modal */}
      {showCityList && selectedEquipmentForCities && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCityList(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">ערים המשתמשות ב-{selectedEquipmentForCities.name}</h3>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCities ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : citiesUsingEquipment.length === 0 ? (
                <p className="text-gray-500 text-center">אין ערים המשתמשות בפריט זה</p>
              ) : (
                <ul className="space-y-2">
                  {citiesUsingEquipment.map(city => (
                    <li key={city.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                      {city.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <Button onClick={() => setShowCityList(false)} className="w-full">
                סגור
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergeSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMergeModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">מיזוג פריט</h3>
              <p className="text-sm text-gray-500 mt-1">
                מזג את "{mergeSource.name}" לתוך פריט אחר
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium mb-2">בחר פריט יעד</label>
              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">בחר פריט...</option>
                {equipment
                  .filter(e => e.id !== mergeSource.id)
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))
                }
              </select>
              <p className="text-xs text-gray-500 mt-2">
                כל הערים שמשתמשות ב-"{mergeSource.name}" יעודכנו לפריט החדש, והפריט הנוכחי יימחק.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <Button
                onClick={handleMergeEquipment}
                disabled={!mergeTarget || loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'ממזג...' : 'מזג'}
              </Button>
              <Button variant="outline" onClick={() => setShowMergeModal(false)} className="flex-1">
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
