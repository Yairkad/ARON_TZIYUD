'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ReportsTabProps {
  cityId: string
  cityName: string
}

interface StatisticsData {
  period: {
    start: string
    end: string
    startDate: string
    endDate: string
  }
  borrows: {
    total: number
    returned: number
    pending: number
    returnRate: number
  }
  requests: {
    total: number
    approved: number
    rejected: number
    active: number
    approvalRate: number
  }
  topBorrowedItems: { name: string; count: number }[]
  equipment: {
    lowStock: { name: string; quantity: number }[]
    faulty: { name: string; days: number }[]
  }
  inventory: {
    totalItems: number
    totalQuantity: number
    workingItems: number
    faultyItems: number
    consumableItems: number
  }
  trends: { month: string; borrows: number; returns: number }[]
  recentActivity: any[]
}

export default function ReportsTab({ cityId, cityName }: ReportsTabProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<StatisticsData | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchStatistics()
  }, [cityId])

  const fetchStatistics = async (startDate?: string, endDate?: string) => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/city/${cityId}/statistics`
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`
      }

      const response = await fetch(url, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    fetchStatistics(dateRange.start, dateRange.end)
  }

  const handleQuickFilter = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })

    fetchStatistics(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
  }

  const handleMonthFilter = (monthsBack: number) => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0)

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })

    fetchStatistics(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchStatistics()}>נסה שוב</Button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardTitle className="text-2xl flex items-center gap-3">
            <span className="text-3xl">📊</span>
            דוחות וסטטיסטיקות - {cityName}
          </CardTitle>
          <p className="text-indigo-100 mt-2">{stats.period.start} - {stats.period.end}</p>
        </CardHeader>
      </Card>

      {/* Date Filter */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-gray-700">סינון לפי תאריך:</span>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(7)}
                className="text-xs"
              >
                7 ימים
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(30)}
                className="text-xs"
              >
                30 ימים
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthFilter(0)}
                className="text-xs"
              >
                החודש
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthFilter(1)}
                className="text-xs"
              >
                חודש קודם
              </Button>
            </div>

            {/* Custom date range */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-36 text-sm"
              />
              <span className="text-gray-500">עד</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-36 text-sm"
              />
              <Button onClick={handleDateFilter} size="sm">
                סנן
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Borrows */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{stats.borrows.total}</div>
            <div className="text-sm text-green-700 font-medium">השאלות</div>
          </CardContent>
        </Card>

        {/* Returns */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{stats.borrows.returned}</div>
            <div className="text-sm text-blue-700 font-medium">החזרות</div>
          </CardContent>
        </Card>

        {/* Pending Returns */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-2">{stats.borrows.pending}</div>
            <div className="text-sm text-amber-700 font-medium">ממתינים להחזרה</div>
          </CardContent>
        </Card>

        {/* Return Rate */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{stats.borrows.returnRate}%</div>
            <div className="text-sm text-purple-700 font-medium">אחוז החזרה</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Stats */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📝</span> סטטיסטיקת בקשות
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-700">{stats.requests.total}</div>
              <div className="text-xs text-gray-500">סה"כ בקשות</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{stats.requests.approved}</div>
              <div className="text-xs text-green-600">אושרו</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-2xl font-bold text-red-600">{stats.requests.rejected}</div>
              <div className="text-xs text-red-600">נדחו</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <div className="text-2xl font-bold text-amber-600">{stats.requests.active}</div>
              <div className="text-xs text-amber-600">ממתינות</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">אחוז אישור: </span>
            <span className="font-bold text-indigo-600">{stats.requests.approvalRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Borrowed Items */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🏆</span> פריטים מושאלים ביותר
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {stats.topBorrowedItems.length > 0 ? (
              <div className="space-y-3">
                {stats.topBorrowedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${
                        index === 0 ? 'bg-amber-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">אין נתונים לתקופה זו</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📦</span> סיכום מלאי
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-gray-700">{stats.inventory.totalItems}</div>
                <div className="text-xs text-gray-500">סוגי פריטים</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.inventory.totalQuantity}</div>
                <div className="text-xs text-blue-600">יחידות סה"כ</div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-600">{stats.inventory.workingItems}</div>
                <div className="text-xs text-green-600">תקינים</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.inventory.faultyItems}</div>
                <div className="text-xs text-orange-600">תקולים</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(stats.equipment.lowStock.length > 0 || stats.equipment.faulty.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Low Stock */}
          {stats.equipment.lowStock.length > 0 && (
            <Card className="border-2 border-amber-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                  <span>⚠️</span> פריטים במלאי נמוך ({stats.equipment.lowStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {stats.equipment.lowStock.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-amber-50 rounded-lg">
                      <span>{item.name}</span>
                      <span className="font-bold text-amber-700">{item.quantity} יחידות</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Faulty Equipment */}
          {stats.equipment.faulty.length > 0 && (
            <Card className="border-2 border-red-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100">
                <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                  <span>🔧</span> ציוד תקול ({stats.equipment.faulty.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {stats.equipment.faulty.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                      <span>{item.name}</span>
                      <span className="font-bold text-red-700">{item.days} ימים</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trends Chart (Simple) */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📈</span> מגמות - 6 חודשים אחרונים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-end justify-between gap-2 h-48">
            {stats.trends.map((month, index) => {
              const maxValue = Math.max(...stats.trends.map(t => Math.max(t.borrows, t.returns)), 1)
              const borrowHeight = (month.borrows / maxValue) * 100
              const returnHeight = (month.returns / maxValue) * 100

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 items-end h-32 w-full">
                    <div
                      className="flex-1 bg-green-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${borrowHeight}%`, minHeight: month.borrows > 0 ? '8px' : '0' }}
                      title={`השאלות: ${month.borrows}`}
                    />
                    <div
                      className="flex-1 bg-blue-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${returnHeight}%`, minHeight: month.returns > 0 ? '8px' : '0' }}
                      title={`החזרות: ${month.returns}`}
                    />
                  </div>
                  <div className="text-xs text-gray-600 font-medium">{month.month}</div>
                  <div className="text-xs text-gray-400">
                    {month.borrows}/{month.returns}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">השאלות</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">החזרות</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📋</span> פעילות אחרונה
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString('he-IL')}
                    </span>
                    <span className="font-medium">{activity.manager_name}</span>
                  </div>
                  <span className="text-gray-600">{activity.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
