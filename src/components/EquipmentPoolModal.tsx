'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlobalEquipmentPoolWithCategory, EquipmentCategory } from '@/types'

interface EquipmentPoolModalProps {
  isOpen: boolean
  onClose: () => void
  cityId: string
  onEquipmentAdded: () => void
}

export default function EquipmentPoolModal({
  isOpen,
  onClose,
  cityId,
  onEquipmentAdded
}: EquipmentPoolModalProps) {
  const [equipment, setEquipment] = useState<GlobalEquipmentPoolWithCategory[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // New equipment form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newEquipmentName, setNewEquipmentName] = useState('')
  const [newEquipmentCategory, setNewEquipmentCategory] = useState('')
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchEquipment()
      fetchCategories()
    }
  }, [isOpen])

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
      const response = await fetch('/api/global-equipment?status=active&includeCategories=true')
      const data = await response.json()

      if (response.ok) {
        setEquipment(data.equipment || [])
      } else {
        alert('שגיאה בטעינת מאגר הציוד')
      }
    } catch (error) {
      console.error('Error fetching equipment pool:', error)
      alert('שגיאה בטעינת מאגר הציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    const filtered = getFilteredEquipment()
    const allIds = new Set(filtered.map(item => item.id))
    setSelectedIds(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) {
      alert('לא נבחרו פריטים')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/city-equipment/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: cityId,
          equipment_ids: Array.from(selectedIds)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת ציוד')
      }

      alert(data.message)
      setSelectedIds(new Set())
      onEquipmentAdded()
      onClose()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Add new equipment to global pool
  const handleAddNewEquipment = async () => {
    if (!newEquipmentName.trim()) {
      alert('יש להזין שם לציוד')
      return
    }

    // Check if equipment with similar name already exists
    const existingItem = equipment.find(
      item => item.name.toLowerCase().trim() === newEquipmentName.toLowerCase().trim()
    )

    if (existingItem) {
      alert(`פריט בשם "${existingItem.name}" כבר קיים במאגר. אנא בחר אותו מהרשימה.`)
      setSearchQuery(existingItem.name)
      setShowNewForm(false)
      return
    }

    setAddingNew(true)
    try {
      // Add to global pool (will be pending approval for city managers)
      const response = await fetch('/api/global-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEquipmentName.trim(),
          category_id: newEquipmentCategory || null,
          image_url: ''
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת ציוד')
      }

      // If it was added (super admin) or pending approval
      if (data.equipment && data.equipment.status === 'active') {
        // Super admin - equipment is active, add to city immediately
        const addResponse = await fetch('/api/city-equipment/bulk-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city_id: cityId,
            equipment_ids: [data.equipment.id]
          })
        })

        if (addResponse.ok) {
          alert('הפריט נוסף למאגר ולעיר בהצלחה')
          onEquipmentAdded()
          onClose()
        } else {
          alert('הפריט נוסף למאגר אך לא הצלחנו להוסיף לעיר')
        }
      } else {
        // City manager - pending approval
        alert(data.message || 'הפריט נשלח לאישור מנהל ראשי. לאחר האישור תוכל להוסיף אותו לעיר.')
      }

      setNewEquipmentName('')
      setNewEquipmentCategory('')
      setShowNewForm(false)
      fetchEquipment()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setAddingNew(false)
    }
  }

  const getFilteredEquipment = () => {
    return equipment.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }

  const filteredEquipment = getFilteredEquipment()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">בחר ציוד מהמאגר</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                סמן פריטים או הוסף חדש
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="p-3 sm:p-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
            <Input
              placeholder="🔍 חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-base"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border rounded w-full sm:w-40 text-sm"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              disabled={loading}
              className="text-xs"
            >
              ✓ הכל ({filteredEquipment.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeselectAll}
              disabled={loading}
              className="text-xs"
            >
              ✗ בטל
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewForm(!showNewForm)}
              className="text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
            >
              + חדש
            </Button>
            <div className="flex-1 text-left text-xs text-gray-600 flex items-center">
              נבחרו: {selectedIds.size}
            </div>
          </div>

          {/* New Equipment Form */}
          {showNewForm && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-green-800">הוסף פריט חדש למאגר</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="שם הפריט"
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  className="flex-1 text-sm"
                />
                <select
                  value={newEquipmentCategory}
                  onChange={(e) => setNewEquipmentCategory(e.target.value)}
                  className="p-2 border rounded text-sm"
                >
                  <option value="">קטגוריה (אופציונלי)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleAddNewEquipment}
                  disabled={addingNew || !newEquipmentName.trim()}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  {addingNew ? '...' : 'הוסף'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * הפריט יישלח לאישור מנהל ראשי לפני הוספתו למאגר
              </p>
            </div>
          )}
        </div>

        {/* Equipment Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery || categoryFilter !== 'all'
                ? 'לא נמצאו פריטים מתאימים'
                : 'אין פריטים במאגר'}
              <br />
              <button
                onClick={() => setShowNewForm(true)}
                className="text-green-600 hover:underline mt-2 text-sm"
              >
                + הוסף פריט חדש
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredEquipment.map(item => {
                const isSelected = selectedIds.has(item.id)
                const category = item.category

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`
                      relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-1.5 right-1.5">
                      <div
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center
                          ${isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Image/Emoji */}
                    <div className="flex justify-center mb-2 mt-3">
                      {item.image_url ? (
                        item.image_url.startsWith('http') ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-3xl">{item.image_url}</div>
                        )
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xl">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="text-center">
                      <p className="font-medium text-xs text-gray-800 line-clamp-2 min-h-[2rem]">
                        {item.name}
                      </p>
                      {category && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{category.name}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex justify-between items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} size="sm">
            ביטול
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={loading || selectedIds.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {loading ? '...' : `הוסף ${selectedIds.size} פריטים`}
          </Button>
        </div>
      </div>
    </div>
  )
}
