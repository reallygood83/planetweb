'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { 
  FileText, 
  Users, 
  Eye, 
  Share2, 
  Trash2, 
  Calendar,
  BookOpen,
  Copy,
  ExternalLink
} from 'lucide-react'

interface Survey {
  id: string
  title: string
  description?: string
  questions: {
    multipleChoice: Array<{
      question: string
      options: string[]
    }>
    shortAnswer: Array<{
      question: string
    }>
  }
  created_at: string
  survey_type?: string
  behavior_criteria?: any
  evaluation_plans?: {
    id: string
    subject: string
    grade: string
    semester: string
    unit: string
  }
  responses_count?: number
}

interface ClassInfo {
  id: string
  class_name: string
  school_code?: string
  students: Array<{ number: number; name: string }>
}

export default function SurveysPage() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [hasLocalSurveys, setHasLocalSurveys] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSurveys()
      fetchClasses()
    }
  }, [user])

  const fetchSurveys = async () => {
    try {
      // 먼저 서버에서 설문 목록을 가져오려고 시도
      const response = await fetch('/api/surveys')
      let serverSurveys: Survey[] = []
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          serverSurveys = data.data
        }
      }
      
      // 로컬 저장소에서 저장된 설문들도 가져오기
      const localSurveys = JSON.parse(localStorage.getItem('saved_surveys') || '[]')
      
      // 서버 설문과 로컬 설문을 합치기
      const allSurveys = [...serverSurveys, ...localSurveys]
      
      // 중복 제거 (ID 기준)
      const uniqueSurveys = allSurveys.filter((survey, index, arr) => 
        arr.findIndex(s => s.id === survey.id) === index
      )
      
      // 생성 날짜 기준으로 정렬 (최신순)
      uniqueSurveys.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setSurveys(uniqueSurveys)
      setHasLocalSurveys(localSurveys.length > 0)
      
      if (localSurveys.length > 0) {
        console.log(`Found ${localSurveys.length} surveys in local storage`)
      }
    } catch (error) {
      console.error('Error fetching surveys:', error)
      
      // 서버 오류시 로컬 저장소의 설문만이라도 표시
      const localSurveys = JSON.parse(localStorage.getItem('saved_surveys') || '[]')
      setSurveys(localSurveys)
      setHasLocalSurveys(localSurveys.length > 0)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          // students 배열이 없는 경우 빈 배열로 초기화
          const validClasses = data.data.map((cls: any) => ({
            ...cls,
            students: Array.isArray(cls.students) ? cls.students : []
          }))
          setClasses(validClasses)
        } else {
          setClasses([])
        }
      } else {
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    }
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('이 설문을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSurveys(surveys.filter(s => s.id !== surveyId))
        alert('설문이 삭제되었습니다.')
      } else {
        alert('설문 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting survey:', error)
      alert('설문 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCopyStudentLink = (classInfo: ClassInfo) => {
    if (!classInfo.school_code) {
      alert('이 학급에는 아직 학급 코드가 없습니다. 학급을 다시 생성하거나 관리자에게 문의하세요.')
      return
    }
    const studentUrl = `${window.location.origin}/student/surveys?code=${classInfo.school_code}`
    navigator.clipboard.writeText(studentUrl)
    alert(`학생 접속 링크가 복사되었습니다!\n\n학급 코드: ${classInfo.school_code}\n링크: ${studentUrl}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">설문 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            생성된 설문을 확인하고 학생들에게 배포하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/dashboard/generate'}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            새 설문 생성
          </Button>
        </div>
      </div>

      {/* Database Configuration Notice */}
      {hasLocalSurveys && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-yellow-600 mt-0.5">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                임시 저장된 설문이 있습니다
              </h3>
              <p className="text-sm text-yellow-700 mb-2">
                데이터베이스가 설정되지 않아 일부 설문이 브라우저에만 임시 저장되어 있습니다. 
                실제 서비스 이용을 위해서는 Supabase 데이터베이스 설정이 필요합니다.
              </p>
              <p className="text-xs text-yellow-600">
                💡 임시 저장된 설문은 브라우저 데이터를 삭제하면 사라질 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Class Links Section */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              학생 접속 링크
            </CardTitle>
            <CardDescription>
              학생들이 설문에 참여할 수 있도록 학급별 링크를 공유하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {classes.map((classInfo) => (
                <div key={classInfo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{classInfo.class_name}</div>
                    <div className="text-sm text-gray-500">
                      {classInfo.school_code ? `학급 코드: ${classInfo.school_code} | ` : ''}학생 수: {(classInfo.students || []).length}명
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyStudentLink(classInfo)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      링크 복사
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/student/surveys?code=${classInfo.school_code}`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      미리보기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Surveys List */}
      {surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              생성된 설문이 없습니다
            </h3>
            <p className="text-gray-500 mb-4">
              첫 번째 자기평가 설문을 생성해보세요
            </p>
            <Button onClick={() => window.location.href = '/dashboard/generate'}>
              설문 생성하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {surveys.map((survey) => (
            <Card key={survey.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      {survey.title}
                    </CardTitle>
                    {survey.description && (
                      <CardDescription className="mb-3">
                        {survey.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {survey.id.startsWith('local-') && (
                        <Badge variant="destructive" className="text-xs">
                          임시 저장
                        </Badge>
                      )}
                      {survey.evaluation_plans && (
                        <>
                          <Badge variant="secondary">
                            {survey.evaluation_plans.subject}
                          </Badge>
                          <Badge variant="outline">
                            {survey.evaluation_plans.grade}
                          </Badge>
                          <Badge variant="outline">
                            {survey.evaluation_plans.semester}
                          </Badge>
                          <Badge variant="outline">
                            {survey.evaluation_plans.unit}
                          </Badge>
                        </>
                      )}
                      {!survey.evaluation_plans && survey.survey_type === 'behavior_development' && (
                        <Badge variant="secondary">
                          행동발달사항
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(survey.created_at)}
                    </span>
                    <span>
                      객관식 {survey.questions?.multipleChoice?.length || 0}문항 + 
                      주관식 {survey.questions?.shortAnswer?.length || 0}문항
                    </span>
                    {survey.responses_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        응답 {survey.responses_count}개
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSurvey(survey)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    설문 미리보기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/responses?surveyId=${survey.id}`}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    응답 확인
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSurvey(survey.id)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Survey Preview Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedSurvey.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSurvey(null)}
                >
                  ✕
                </Button>
              </div>
              {selectedSurvey.description && (
                <p className="text-gray-600 mt-2">{selectedSurvey.description}</p>
              )}
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Multiple Choice Questions */}
                {(selectedSurvey.questions?.multipleChoice || []).map((q, index) => (
                  <div key={`mc-${index}`} className="space-y-2">
                    <h4 className="font-medium">
                      {index + 1}. {q.question}
                    </h4>
                    <div className="space-y-1 ml-4">
                      {(q.options || []).map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input type="radio" disabled />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Short Answer Questions */}
                {(selectedSurvey.questions?.shortAnswer || []).map((q, index) => (
                  <div key={`sa-${index}`} className="space-y-2">
                    <h4 className="font-medium">
                      {(selectedSurvey.questions?.multipleChoice?.length || 0) + index + 1}. {q.question}
                    </h4>
                    <textarea
                      className="w-full p-2 border rounded-md resize-none"
                      rows={3}
                      disabled
                      placeholder="답변을 입력하세요..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}