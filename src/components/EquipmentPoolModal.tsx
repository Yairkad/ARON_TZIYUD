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
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">בחר ציוד מהמאגר הגלובלי</h2>
              <p className="text-gray-600 text-sm mt-1">
                סמן את הפריטים שברצונך להוסיף לעיר
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
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <Input
              placeholder="🔍 חיפוש ציוד..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border rounded w-full md:w-48"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              disabled={loading}
            >
              ✓ סמן הכל ({filteredEquipment.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeselectAll}
              disabled={loading}
            >
              ✗ בטל הכל
            </Button>
            <div className="flex-1 text-left text-sm text-gray-600 flex items-center">
              נבחרו: {selectedIds.size} פריטים
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">טוען...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery || categoryFilter !== 'all'
                ? 'לא נמצאו פריטים מתאימים'
                : 'אין פריטים במאגר'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredEquipment.map(item => {
                const isSelected = selectedIds.has(item.id)
                const category = item.equipment_categories

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`
                      relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 right-2">
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Image/Emoji */}
                    <div className="flex justify-center mb-3 mt-4">
                      {item.image_url ? (
                        item.image_url.startsWith('http') ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="text-5xl">{item.image_url}</div>
                        )
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="text-center">
                      <p className="font-semibold text-sm text-gray-800 line-clamp-2 min-h-[2.5rem]">
                        {item.name}
                      </p>
                      {category && (
                        <p className="text-xs text-gray-500 mt-1">{category.name}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            ביטול
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={loading || selectedIds.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'מוסיף...' : `הוסף ${selectedIds.size} פריטים נבחרים ←`}
          </Button>
        </div>
      </div>
    </div>
  )
}
