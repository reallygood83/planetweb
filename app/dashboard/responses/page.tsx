'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { Users, FileText, Calendar, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { GenerateRecordModal } from '@/components/records/GenerateRecordModal'

interface SurveyResponse {
  id: string
  survey_id: string
  student_name: string
  class_id: string
  responses: {
    multipleChoice: { [key: number]: string }
    shortAnswer: { [key: number]: string }
  }
  submitted_at: string
  survey?: {
    title: string
    evaluation_plan?: {
      subject: string
      grade: string
      semester: string
      unit: string
    }
  }
  class?: {
    class_name: string
    grade: string
  }
}

export default function ResponsesPage() {
  const { user } = useAuth()
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all')
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchResponses()
    }
  }, [user])

  const fetchResponses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/responses')
      const data = await response.json()

      if (data.success) {
        setResponses(data.data)
      }
    } catch (error) {
      console.error('Error fetching responses:', error)
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 응답
  const filteredResponses = responses.filter(response => {
    if (selectedClass !== 'all' && response.class_id !== selectedClass) return false
    if (selectedSurvey !== 'all' && response.survey_id !== selectedSurvey) return false
    return true
  })

  // 고유한 학급과 설문 목록
  const uniqueClasses = Array.from(new Set(responses.map(r => r.class_id)))
    .map(id => responses.find(r => r.class_id === id)?.class)
    .filter(Boolean)

  const uniqueSurveys = Array.from(new Set(responses.map(r => r.survey_id)))
    .map(id => responses.find(r => r.survey_id === id)?.survey)
    .filter(Boolean)

  // 응답률 계산
  const responseStats = {
    total: filteredResponses.length,
    byClass: {} as { [key: string]: number },
    bySurvey: {} as { [key: string]: number }
  }

  filteredResponses.forEach(response => {
    const className = response.class?.class_name || 'Unknown'
    const surveyTitle = response.survey?.title || 'Unknown'
    
    responseStats.byClass[className] = (responseStats.byClass[className] || 0) + 1
    responseStats.bySurvey[surveyTitle] = (responseStats.bySurvey[surveyTitle] || 0) + 1
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">응답 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">학생 응답 관리</h1>
        <p className="text-gray-600">학생들의 자기평가 응답을 확인하고 생기부를 생성할 수 있습니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 응답</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseStats.total}</div>
            <p className="text-xs text-muted-foreground">총 응답 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">참여 학급</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(responseStats.byClass).length}</div>
            <p className="text-xs text-muted-foreground">학급 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 설문</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(responseStats.bySurvey).length}</div>
            <p className="text-xs text-muted-foreground">설문 수</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">학급 선택</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">전체 학급</option>
                {uniqueClasses.map(cls => (
                  <option key={cls?.class_name} value={responses.find(r => r.class?.class_name === cls?.class_name)?.class_id}>
                    {cls?.class_name} ({cls?.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">설문 선택</label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">전체 설문</option>
                {uniqueSurveys.map(survey => (
                  <option key={survey?.title} value={responses.find(r => r.survey?.title === survey?.title)?.survey_id}>
                    {survey?.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>응답 목록</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard/responses/batch'}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                일괄 생성
              </Button>
              <Button className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                선택 항목 생기부 생성
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredResponses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 응답이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{response.student_name}</h3>
                        <Badge variant="outline">{response.class?.class_name}</Badge>
                        <Badge>{response.survey?.evaluation_plan?.subject}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {response.survey?.title} - {response.survey?.evaluation_plan?.unit}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(response.submitted_at).toLocaleDateString('ko-KR')}
                        </span>
                        <span>
                          객관식 {Object.keys(response.responses.multipleChoice).length}개, 
                          주관식 {Object.keys(response.responses.shortAnswer).length}개 응답
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        응답 상세보기
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => {
                          setSelectedResponse(response)
                          setShowGenerateModal(true)
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        생기부 생성
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Record Modal */}
      {selectedResponse && (
        <GenerateRecordModal
          open={showGenerateModal}
          onOpenChange={(open) => {
            setShowGenerateModal(open)
            if (!open) setSelectedResponse(null)
          }}
          responseData={{
            id: selectedResponse.id,
            student_name: selectedResponse.student_name,
            class_name: selectedResponse.class?.class_name || '',
            survey: selectedResponse.survey
          }}
        />
      )}
    </div>
  )
}