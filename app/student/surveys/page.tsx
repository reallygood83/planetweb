'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, FileText, ArrowLeft } from 'lucide-react'

interface Survey {
  id: string
  title: string
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
  evaluation_plans: {
    subject: string
    grade: string
    semester: string
  }
}

interface ClassInfo {
  id: string
  name: string
  user_id: string
}

function StudentSurveysContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [studentInfo, setStudentInfo] = useState<{ classCode: string; studentName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const classCode = searchParams?.get('classCode')
    const storedStudentInfo = sessionStorage.getItem('studentInfo')

    if (!classCode || !storedStudentInfo) {
      router.push('/student')
      return
    }

    const parsedStudentInfo = JSON.parse(storedStudentInfo)
    if (parsedStudentInfo.classCode !== classCode) {
      router.push('/student')
      return
    }

    setStudentInfo(parsedStudentInfo)
    fetchSurveys(classCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router])

  const fetchSurveys = async (classCode: string) => {
    try {
      const response = await fetch(`/api/student/surveys?classCode=${classCode}`)
      if (!response.ok) {
        throw new Error('Failed to fetch surveys')
      }
      
      const data = await response.json()
      setClassInfo(data.class)
      setSurveys(data.surveys)
    } catch (error) {
      console.error('Error fetching surveys:', error)
      alert('설문을 불러오는 중 오류가 발생했습니다.')
      router.push('/student')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTakeSurvey = (survey: Survey) => {
    router.push(`/student/survey/${survey.id}?classCode=${studentInfo?.classCode}`)
  }

  const handleBackToJoin = () => {
    sessionStorage.removeItem('studentInfo')
    router.push('/student')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">설문 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {classInfo?.name} 자기평가
              </h1>
              <p className="text-gray-600">
                안녕하세요, {studentInfo?.studentName}님! 💪
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleBackToJoin}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              다른 학급 참여
            </Button>
          </div>

          {/* Surveys List */}
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 설문이 없습니다
                </h3>
                <p className="text-gray-500">
                  선생님이 설문을 등록하면 여기에 나타납니다
                </p>
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
                        <CardDescription className="flex items-center gap-4">
                          <Badge variant="secondary">
                            {survey.evaluation_plans.subject} | {survey.evaluation_plans.grade} | {survey.evaluation_plans.semester}
                          </Badge>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {new Date(survey.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        객관식 {survey.questions.multipleChoice.length}문항 + 
                        주관식 {survey.questions.shortAnswer.length}문항
                      </div>
                      <Button onClick={() => handleTakeSurvey(survey)}>
                        설문 참여하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentSurveys() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 준비하는 중...</p>
        </div>
      </div>
    }>
      <StudentSurveysContent />
    </Suspense>
  )
}