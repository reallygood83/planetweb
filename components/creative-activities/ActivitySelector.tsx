'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Users, BookOpen, Heart, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CreativeActivity {
  id: string
  order_number: number
  activity_date: string
  activity_name: string
  activity_area: string
}

interface Props {
  classId: string
  studentName: string
  selectedActivityIds: string[]
  onSelectionChange: (activityIds: string[]) => void
}

const AREA_ICONS: Record<string, any> = {
  '자율활동': Users,
  '동아리활동': BookOpen,
  '봉사활동': Heart,
  '진로활동': Briefcase
}

const AREA_COLORS: Record<string, string> = {
  '자율활동': 'bg-blue-100 text-blue-800',
  '동아리활동': 'bg-green-100 text-green-800',
  '봉사활동': 'bg-red-100 text-red-800',
  '진로활동': 'bg-purple-100 text-purple-800'
}

export default function ActivitySelector({ 
  classId, 
  studentName, 
  selectedActivityIds, 
  onSelectionChange 
}: Props) {
  const [activities, setActivities] = useState<CreativeActivity[]>([])
  const [semester, setSemester] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return month >= 3 && month <= 8 ? `${year}-1` : `${year}-2`
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, semester])

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/creative-activities?classId=${classId}&semester=${semester}`)
      if (!response.ok) throw new Error('Failed to fetch activities')
      
      const data = await response.json()
      setActivities(data.data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivityToggle = (activityId: string) => {
    const newSelection = selectedActivityIds.includes(activityId)
      ? selectedActivityIds.filter(id => id !== activityId)
      : [...selectedActivityIds, activityId]
    
    onSelectionChange(newSelection)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'yyyy년 M월 d일', { locale: ko })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">활동 목록을 불러오는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>창의적 체험활동 선택</CardTitle>
            <CardDescription>
              {studentName} 학생의 누가기록에 포함할 활동을 선택하세요
            </CardDescription>
          </div>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-1">2024-1학기</SelectItem>
              <SelectItem value="2024-2">2024-2학기</SelectItem>
              <SelectItem value="2025-1">2025-1학기</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>등록된 창의적 체험활동이 없습니다.</p>
            <p className="text-sm mt-2">
              먼저 창의적 체험활동을 등록해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = AREA_ICONS[activity.activity_area] || Calendar
              const isSelected = selectedActivityIds.includes(activity.id)
              
              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer
                    ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => handleActivityToggle(activity.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleActivityToggle(activity.id)}
                    className="mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{activity.activity_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{formatDate(activity.activity_date)}</span>
                          <Badge 
                            variant="secondary" 
                            className={AREA_COLORS[activity.activity_area]}
                          >
                            {activity.activity_area}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        #{activity.order_number}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {activities.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p>✅ {selectedActivityIds.length}개 활동 선택됨</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}