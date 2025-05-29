'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home, RotateCcw } from 'lucide-react'

function SurveyCompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [studentInfo, setStudentInfo] = useState<{ classCode: string; studentName: string } | null>(null)

  useEffect(() => {
    const classCode = searchParams?.get('code')
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
  }, [searchParams, router])

  const handleBackToSurveys = () => {
    if (studentInfo) {
      router.push(`/student/surveys?code=${studentInfo.classCode}`)
    }
  }

  const handleNewSession = () => {
    sessionStorage.removeItem('studentInfo')
    router.push('/student')
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 준비하는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">설문 완료! 🎉</h1>
              <p className="text-lg text-gray-600">
                {studentInfo.studentName}님의 응답이 성공적으로 제출되었습니다
              </p>
            </div>
          </div>

          {/* Success Card */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-green-700">응답 제출 완료</CardTitle>
              <CardDescription>
                소중한 자기평가에 참여해주셔서 감사합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">✅ 제출 완료</h3>
                <p className="text-green-700 text-sm mb-3">
                  여러분의 응답은 안전하게 저장되었으며, 선생님께서 확인하실 수 있습니다.
                </p>
                <ul className="text-green-600 text-sm space-y-1">
                  <li>• 제출된 응답은 수정할 수 없습니다</li>
                  <li>• 선생님께서 응답을 바탕으로 생기부를 작성해주실 예정입니다</li>
                  <li>• 다른 설문이 있다면 계속 참여할 수 있습니다</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">💡 다음 단계</h3>
                <p className="text-blue-700 text-sm">
                  선생님께서 여러분의 응답과 수업 관찰 내용을 종합하여 
                  개별 학습 기록을 작성해주실 예정입니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleBackToSurveys}
              className="flex items-center gap-2"
              size="lg"
            >
              <RotateCcw className="h-4 w-4" />
              다른 설문 보기
            </Button>
            
            <Button
              variant="outline"
              onClick={handleNewSession}
              className="flex items-center gap-2"
              size="lg"
            >
              <Home className="h-4 w-4" />
              다른 학급 참여
            </Button>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              학습에 대한 여러분의 생각을 나누어 주셔서 감사합니다! 🌟
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SurveyComplete() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 준비하는 중...</p>
        </div>
      </div>
    }>
      <SurveyCompleteContent />
    </Suspense>
  )
}