'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, Users } from 'lucide-react'

export default function StudentPage() {
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
      alert('학급 코드와 이름을 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      // Store student info in sessionStorage
      sessionStorage.setItem('studentInfo', JSON.stringify({
        classCode: classCode.trim(),
        studentName: studentName.trim()
      }))
      
      // 공유 코드로 접근한 경우 특정 설문으로 바로 이동
      if (surveyId && shareCode) {
        router.push(`/student/survey/${surveyId}?share=${shareCode}`)
      } else {
        // 일반 학급 코드로 접근한 경우 설문 목록으로 이동
        router.push(`/student/surveys?code=${classCode.trim()}`)
      }
    } catch (error) {
      console.error('Error joining class:', error)
      alert('학급 참여 중 오류가 발생했습니다.')
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
                {shareCode ? '설문 참여하기' : '학급 참여하기'}
              </CardTitle>
              <CardDescription>
                {shareCode 
                  ? '이름을 입력하고 설문에 참여하세요'
                  : '선생님께서 알려주신 학급 코드를 입력해주세요'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!shareCode && (
                <div className="space-y-2">
                  <Label htmlFor="classCode">학급 코드</Label>
                  <Input
                    id="classCode"
                    placeholder="예: ABC123"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="text-center font-mono text-lg"
                  />
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
                {isLoading ? '참여 중...' : '학급 참여하기'}
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>학급 코드는 담임선생님께 문의하세요</p>
          </div>
        </div>
      </div>
    </div>
  )
}