'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, Users } from 'lucide-react'

function StudentPageContent() {
  const [classCode, setClassCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 공유 링크로 접근한 경우 처리
  const surveyId = searchParams?.get('surveyId')
  const shareCode = searchParams?.get('share')
  
  useEffect(() => {
    if (shareCode) {
      setClassCode(shareCode)
    }
  }, [shareCode])

  const handleJoinClass = async () => {
    if (!classCode.trim() || !studentName.trim()) {
      alert('접근 코드와 이름을 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const code = classCode.trim()
      
      // Store student info in sessionStorage
      sessionStorage.setItem('studentInfo', JSON.stringify({
        classCode: code,
        studentName: studentName.trim()
      }))
      
      // 공유 코드로 접근한 경우 특정 설문으로 바로 이동
      if (surveyId && shareCode) {
        router.push(`/student/survey/${surveyId}?share=${shareCode}`)
      } else if (code.startsWith('S')) {
        // 설문 공유 코드인 경우 - 설문 ID를 찾아서 바로 이동
        alert('설문 공유 코드는 직접 링크로 접근해주세요.')
      } else {
        // 학급 코드로 접근한 경우 설문 목록으로 이동
        router.push(`/student/surveys?classCode=${code}`)
      }
    } catch (error) {
      console.error('Error joining class:', error)
      alert('참여 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Planet</h1>
            <p className="text-gray-600">학생 자기평가 시스템</p>
          </div>

          {/* Join Form */}
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>
                {shareCode ? '설문 참여하기' : '코드 입력하기'}
              </CardTitle>
              <CardDescription>
                {shareCode 
                  ? '이름을 입력하고 설문에 참여하세요'
                  : '선생님께서 알려주신 코드를 입력해주세요'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!shareCode && (
                <div className="space-y-2">
                  <Label htmlFor="classCode">접근 코드</Label>
                  <Input
                    id="classCode"
                    placeholder="학급코드(ABC123) 또는 설문코드(SDEF45)"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="text-center font-mono text-lg"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    학급코드: 여러 설문 목록 보기 | 설문코드: 특정 설문 바로 접근
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="studentName">이름</Label>
                <Input
                  id="studentName"
                  placeholder="홍길동"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleJoinClass}
                disabled={isLoading || !classCode.trim() || !studentName.trim()}
                className="w-full"
              >
                {isLoading ? '참여 중...' : '참여하기'}
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>코드를 모르시나요? 담임선생님께 문의하세요</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <StudentPageContent />
    </Suspense>
  )
}