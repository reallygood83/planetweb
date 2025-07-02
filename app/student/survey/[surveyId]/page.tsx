'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from 'lucide-react'

interface Question {
  multipleChoice: Array<{
    question: string
    options: string[]
    guideline?: string
  }>
  shortAnswer: Array<{
    question: string
    guideline?: string
  }>
}

interface Survey {
  id: string
  title: string
  questions: Question
  evaluation_plans?: {
    subject: string
    grade: string
    semester: string
  }
}

type ResponseType = {
  multipleChoice: { [key: number]: string }
  shortAnswer: { [key: number]: string }
}

function TakeSurveyContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [studentInfo, setStudentInfo] = useState<{ classCode: string; studentName: string } | null>(null)
  const [responses, setResponses] = useState<ResponseType>({
    multipleChoice: {},
    shortAnswer: {}
  })
  const [currentStep, setCurrentStep] = useState(0) // 0: multiple choice, 1: short answer, 2: submit
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const classCode = searchParams?.get('classCode')
    const shareCode = searchParams?.get('share')
    const storedStudentInfo = sessionStorage.getItem('studentInfo')

    // 공유 코드로 접근한 경우 처리
    if (shareCode && !storedStudentInfo) {
      // 공유 코드로 접근했지만 학생 정보가 없는 경우
      // 학생 정보 입력 페이지로 이동하되, 설문 ID와 공유 코드를 전달
      router.push(`/student?surveyId=${params.surveyId}&share=${shareCode}`)
      return
    }

    // 일반 학급 코드로 접근한 경우
    if (!classCode && !shareCode) {
      router.push('/student')
      return
    }

    if (storedStudentInfo) {
      const parsedStudentInfo = JSON.parse(storedStudentInfo)
      
      // 공유 코드로 접근한 경우는 학급 코드 검증 생략
      if (classCode && parsedStudentInfo.classCode !== classCode) {
        router.push('/student')
        return
      }
      
      setStudentInfo(parsedStudentInfo)
      fetchSurvey()
    } else if (!shareCode) {
      // 학생 정보가 없고 공유 코드도 없는 경우
      router.push('/student')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.surveyId, searchParams, router])

  const fetchSurvey = async () => {
    try {
      const classCode = searchParams?.get('classCode')
      const shareCode = searchParams?.get('share')
      
      // 학생용 API 엔드포인트 사용
      let apiUrl = `/api/student/survey/${params.surveyId}`
      if (classCode) {
        apiUrl += `?classCode=${classCode}`
      } else if (shareCode) {
        apiUrl += `?share=${shareCode}`
      }
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch survey')
      }
      
      const data = await response.json()
      console.log('Fetched survey data:', data)
      
      // API 응답 형식 확인
      let surveyData = data.success && data.data ? data.data : data
      
      // questions 형식 변환 (필요한 경우)
      if (surveyData.questions && Array.isArray(surveyData.questions)) {
        surveyData = {
          ...surveyData,
          questions: {
            multipleChoice: surveyData.questions.filter((q: any) => q.type === 'multiple_choice').map((q: any) => ({
              question: q.question,
              options: q.options || [],
              guideline: q.guideline
            })),
            shortAnswer: surveyData.questions.filter((q: any) => q.type === 'short_answer').map((q: any) => ({
              question: q.question,
              guideline: q.guideline
            }))
          }
        }
      }
      
      setSurvey(surveyData)
    } catch (error) {
      console.error('Error fetching survey:', error)
      alert('설문을 불러오는 중 오류가 발생했습니다.')
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  const handleMultipleChoiceChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      multipleChoice: {
        ...prev.multipleChoice,
        [questionIndex]: value
      }
    }))
  }

  const handleShortAnswerChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      shortAnswer: {
        ...prev.shortAnswer,
        [questionIndex]: value
      }
    }))
  }

  const canProceedToNext = () => {
    if (currentStep === 0) {
      // Check if all multiple choice questions are answered
      return survey?.questions.multipleChoice.every((_, index) => 
        responses.multipleChoice[index]
      ) || false
    }
    if (currentStep === 1) {
      // Check if all short answer questions are answered
      return survey?.questions.shortAnswer.every((_, index) => 
        responses.shortAnswer[index]?.trim()
      ) || false
    }
    return false
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!survey || !studentInfo) return

    setIsSubmitting(true)
    try {
      const shareCode = searchParams?.get('share')
      
      const response = await fetch('/api/student/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: survey.id,
          studentName: studentInfo.studentName,
          classCode: shareCode || studentInfo.classCode,
          responses: responses
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit response')
      }

      // Success! Navigate to completion page
      const completionCode = shareCode || studentInfo.classCode
      router.push(`/student/complete?code=${completionCode}`)
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('응답 제출 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getProgressPercentage = () => {
    return ((currentStep + 1) / 3) * 100
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">설문을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">설문을 찾을 수 없습니다.</p>
          <Button onClick={() => router.back()} className="mt-4">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로가기
              </Button>
            </div>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
              {survey.evaluation_plans && (
                <Badge variant="secondary">
                  {survey.evaluation_plans.subject} | {survey.evaluation_plans.grade} | {survey.evaluation_plans.semester}
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>진행률: {Math.round(getProgressPercentage())}%</span>
                <span>단계 {currentStep + 1} / 3</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 0 && '객관식 문항'}
                {currentStep === 1 && '주관식 문항'}
                {currentStep === 2 && '응답 확인'}
              </CardTitle>
              <CardDescription>
                {currentStep === 0 && '각 문항에 대해 가장 적절한 답을 선택해주세요.'}
                {currentStep === 1 && '자신의 생각을 자유롭게 작성해주세요.'}
                {currentStep === 2 && '모든 응답을 확인한 후 제출해주세요.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Multiple Choice Questions */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  {survey.questions.multipleChoice.map((question, index) => (
                    <div key={index} className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </h3>
                        {question.guideline && (
                          <p className="text-sm text-gray-600 mb-3">💡 {question.guideline}</p>
                        )}
                      </div>
                      <RadioGroup
                        value={responses.multipleChoice[index] || ''}
                        onValueChange={(value) => handleMultipleChoiceChange(index, value)}
                      >
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`mc-${index}-${optionIndex}`} />
                            <Label htmlFor={`mc-${index}-${optionIndex}`} className="cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}

              {/* Short Answer Questions */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {survey.questions.shortAnswer.map((question, index) => (
                    <div key={index} className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </h3>
                        {question.guideline && (
                          <p className="text-sm text-gray-600 mb-3">💡 {question.guideline}</p>
                        )}
                      </div>
                      <Textarea
                        placeholder="여기에 답변을 작성해주세요..."
                        value={responses.shortAnswer[index] || ''}
                        onChange={(e) => handleShortAnswerChange(index, e.target.value)}
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Review Step */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      응답 완료!
                    </h3>
                    <p className="text-blue-700 text-sm">
                      모든 문항에 응답하셨습니다. 제출하시면 수정할 수 없으니 확인 후 제출해주세요.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">객관식 응답</h4>
                      <div className="space-y-2">
                        {survey.questions.multipleChoice.map((question, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-gray-600">{index + 1}번:</span>{' '}
                            <span className="font-medium">{responses.multipleChoice[index]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">주관식 응답</h4>
                      <div className="space-y-2">
                        {survey.questions.shortAnswer.map((question, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-gray-600">{index + 1}번:</span>{' '}
                            <span className="text-gray-800">
                              {responses.shortAnswer[index]?.slice(0, 50)}
                              {(responses.shortAnswer[index]?.length || 0) > 50 ? '...' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </Button>

            {currentStep < 2 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNext()}
                className="flex items-center gap-2"
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    제출 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    응답 제출하기
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TakeSurvey() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 준비하는 중...</p>
        </div>
      </div>
    }>
      <TakeSurveyContent />
    </Suspense>
  )
}