'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Save, Calendar, BookOpen, Users, Heart, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CreativeActivity {
  id?: string
  orderNumber: number
  date: string
  name: string
  area: string
}

interface Props {
  classId: string
  className: string
  semester: string
  onSemesterChange: (semester: string) => void
}

const ACTIVITY_AREAS = [
  { value: '자율활동', label: '자율활동', icon: Users, color: 'text-blue-600' },
  { value: '동아리활동', label: '동아리활동', icon: BookOpen, color: 'text-green-600' },
  { value: '봉사활동', label: '봉사활동', icon: Heart, color: 'text-red-600' },
  { value: '진로활동', label: '진로활동', icon: Briefcase, color: 'text-purple-600' }
]

export default function CreativeActivitiesManager({ classId, className, semester, onSemesterChange }: Props) {
  const [activities, setActivities] = useState<CreativeActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [classId, semester])

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/creative-activities?classId=${classId}&semester=${semester}`)
      if (!response.ok) throw new Error('Failed to fetch activities')
      
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        setActivities(data.data.map((activity: any) => ({
          id: activity.id,
          orderNumber: activity.order_number,
          date: activity.activity_date,
          name: activity.activity_name,
          area: activity.activity_area
        })))
      } else {
        // 기본 빈 활동 3개 생성
        setActivities([
          { orderNumber: 1, date: '', name: '', area: '자율활동' },
          { orderNumber: 2, date: '', name: '', area: '자율활동' },
          { orderNumber: 3, date: '', name: '', area: '자율활동' }
        ])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([
        { orderNumber: 1, date: '', name: '', area: '자율활동' },
        { orderNumber: 2, date: '', name: '', area: '자율활동' },
        { orderNumber: 3, date: '', name: '', area: '자율활동' }
      ])
    } finally {
      setIsLoading(false)
      setHasChanges(false)
    }
  }

  const handleAddActivity = () => {
    const newOrderNumber = activities.length > 0 
      ? Math.max(...activities.map(a => a.orderNumber)) + 1 
      : 1
    
    setActivities([...activities, {
      orderNumber: newOrderNumber,
      date: '',
      name: '',
      area: '자율활동'
    }])
    setHasChanges(true)
  }

  const handleUpdateActivity = (index: number, field: keyof CreativeActivity, value: any) => {
    const updated = [...activities]
    updated[index] = { ...updated[index], [field]: value }
    setActivities(updated)
    setHasChanges(true)
  }

  const handleDeleteActivity = (index: number) => {
    const updated = activities.filter((_, i) => i !== index)
    // 순번 재정렬
    updated.forEach((activity, i) => {
      activity.orderNumber = i + 1
    })
    setActivities(updated)
    setHasChanges(true)
  }

  const handleSave = async () => {
    // 유효성 검사
    const validActivities = activities.filter(a => a.date && a.name && a.area)
    if (validActivities.length === 0) {
      alert('최소 하나 이상의 완전한 활동을 입력해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/creative-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          semester,
          activities: validActivities
        })
      })

      if (!response.ok) throw new Error('Failed to save activities')
      
      const data = await response.json()
      alert(data.message || '저장되었습니다.')
      await fetchActivities() // 저장 후 다시 불러오기
    } catch (error) {
      console.error('Error saving activities:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const getAreaIcon = (area: string) => {
    const areaConfig = ACTIVITY_AREAS.find(a => a.value === area)
    if (!areaConfig) return null
    const Icon = areaConfig.icon
    return <Icon className={`h-4 w-4 ${areaConfig.color}`} />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>창의적 체험활동 관리</CardTitle>
            <CardDescription>
              {className} - {semester} 학기
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={semester} onValueChange={onSemesterChange}>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 gap-2 font-medium text-sm text-gray-700 pb-2 border-b">
            <div className="col-span-1 text-center">순</div>
            <div className="col-span-3">날짜</div>
            <div className="col-span-5">활동명</div>
            <div className="col-span-2">영역</div>
            <div className="col-span-1"></div>
          </div>

          {/* 활동 목록 */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              활동 목록을 불러오는 중...
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center font-medium">
                    {activity.orderNumber}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="date"
                      value={activity.date}
                      onChange={(e) => handleUpdateActivity(index, 'date', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-5">
                    <Input
                      value={activity.name}
                      onChange={(e) => handleUpdateActivity(index, 'name', e.target.value)}
                      placeholder="활동명을 입력하세요"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Select 
                      value={activity.area} 
                      onValueChange={(value) => handleUpdateActivity(index, 'area', value)}
                    >
                      <SelectTrigger className="h-9">
                        <div className="flex items-center gap-2">
                          {getAreaIcon(activity.area)}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_AREAS.map(area => (
                          <SelectItem key={area.value} value={area.value}>
                            <div className="flex items-center gap-2">
                              <area.icon className={`h-4 w-4 ${area.color}`} />
                              {area.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteActivity(index)}
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 추가 및 저장 버튼 */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleAddActivity}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              활동 추가
            </Button>
            
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-sm text-orange-600">
                  * 변경사항이 있습니다
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>

          {/* 안내사항 */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-2">💡 작성 안내</p>
            <ul className="space-y-1 text-xs">
              <li>• 학기별로 주요 창의적 체험활동을 2~3개 정도 입력하시면 됩니다.</li>
              <li>• 입력한 활동은 학생별 생기부 작성 시 선택하여 활용할 수 있습니다.</li>
              <li>• 날짜와 활동명은 구체적으로 작성해주세요. (예: 2024-05-15, 봄 현장체험학습-○○수목원)</li>
              <li>• 활동 영역은 4가지 중 선택: 자율활동, 동아리활동, 봉사활동, 진로활동</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}