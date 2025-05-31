'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calendar, Users, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CreativeActivitiesManager from '@/components/creative-activities/CreativeActivitiesManager'

interface ClassInfo {
  id: string
  class_name: string
  grade: string
  class_number: string
  student_count: number
}

export default function CreativeActivitiesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [semester, setSemester] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return month >= 3 && month <= 8 ? `${year}-1` : `${year}-2`
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedClassId && classes.length > 0) {
      const classInfo = classes.find(c => c.id === selectedClassId)
      setSelectedClass(classInfo || null)
    }
  }, [selectedClassId, classes])

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('grade', { ascending: true })
        .order('class_number', { ascending: true })

      if (error) throw error

      setClasses(classesData || [])
      
      // 첫 번째 학급 자동 선택은 제거 - 사용자가 명시적으로 선택하도록
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              대시보드로 돌아가기
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  창의적 체험활동 관리
                </h1>
                <p className="text-gray-600 mt-2">
                  학급별로 창의적 체험활동을 입력하고 관리하세요
                </p>
              </div>
              <Button
                onClick={() => router.push('/dashboard/creative-activities/generate')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                누가기록 생성
              </Button>
            </div>
          </div>

          {/* 학급 선택 */}
          {classes.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>학급 선택</CardTitle>
                <CardDescription>
                  창의적 체험활동을 관리할 학급을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="학급을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {classItem.class_name} ({classItem.student_count}명)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* 활동 관리 - 학급이 선택되었을 때만 표시 */}
          {selectedClassId && selectedClass ? (
            <CreativeActivitiesManager
              classId={selectedClassId}
              className={selectedClass.class_name}
              semester={semester}
              onSemesterChange={setSemester}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  학급을 선택해주세요
                </h3>
                <p className="text-gray-500">
                  창의적 체험활동을 관리할 학급을 먼저 선택해주세요
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}