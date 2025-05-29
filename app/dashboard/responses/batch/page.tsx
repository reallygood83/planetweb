'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { Users, Sparkles, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface BatchGenerationStatus {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  results: {
    studentName: string
    status: 'success' | 'error'
    message?: string
  }[]
}

export default function BatchGeneratePage() {
  const { user } = useAuth()
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [surveys, setSurveys] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [recordType, setRecordType] = useState<string>('교과학습발달상황')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [status, setStatus] = useState<BatchGenerationStatus>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
    results: []
  })

  useEffect(() => {
    if (user) {
      fetchSurveys()
      fetchClasses()
    }
  }, [user])

  const fetchSurveys = async () => {
    try {
      const response = await fetch('/api/teacher/surveys')
      const data = await response.json()
      if (data.success) {
        setSurveys(data.data)
      }
    } catch (error) {
      console.error('Error fetching surveys:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes')
      const data = await response.json()
      if (data.success) {
        setClasses(data.data)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const handleBatchGenerate = async () => {
    if (!selectedSurvey || !selectedClass) {
      alert('설문과 학급을 선택해주세요.')
      return
    }

    setStatus({
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: true,
      results: []
    })

    try {
      // First, get all responses for the selected survey and class
      const responsesRes = await fetch(`/api/teacher/responses?surveyId=${selectedSurvey}&classId=${selectedClass}`)
      const responsesData = await responsesRes.json()

      if (!responsesData.success || !responsesData.data.length) {
        alert('선택한 조건에 해당하는 응답이 없습니다.')
        setStatus(prev => ({ ...prev, inProgress: false }))
        return
      }

      const responses = responsesData.data
      setStatus(prev => ({ ...prev, total: responses.length }))

      // Process each response
      for (const response of responses) {
        try {
          // Generate record for each student
          const generateRes = await fetch('/api/records/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              responseId: response.id,
              recordType,
              teacherNotes,
              includeEvaluationCriteria: true
            })
          })

          const generateData = await generateRes.json()

          if (generateData.success) {
            // Save the generated record
            const saveRes = await fetch('/api/records/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                responseId: response.id,
                recordType,
                content: generateData.data.content,
                metadata: {
                  studentName: response.student_name,
                  className: response.class?.class_name,
                  subject: response.survey?.evaluation_plan?.subject,
                  unit: response.survey?.evaluation_plan?.unit,
                  teacherNotes,
                  batchGenerated: true
                }
              })
            })

            const saveData = await saveRes.json()

            if (saveData.success) {
              setStatus(prev => ({
                ...prev,
                completed: prev.completed + 1,
                results: [...prev.results, {
                  studentName: response.student_name,
                  status: 'success'
                }]
              }))
            } else {
              throw new Error(saveData.error || '저장 실패')
            }
          } else {
            throw new Error(generateData.error || '생성 실패')
          }
        } catch (error) {
          setStatus(prev => ({
            ...prev,
            failed: prev.failed + 1,
            results: [...prev.results, {
              studentName: response.student_name,
              status: 'error',
              message: error instanceof Error ? error.message : '알 수 없는 오류'
            }]
          }))
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Batch generation error:', error)
      alert('일괄 생성 중 오류가 발생했습니다.')
    } finally {
      setStatus(prev => ({ ...prev, inProgress: false }))
    }
  }

  const progress = status.total > 0 ? ((status.completed + status.failed) / status.total) * 100 : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">생기부 일괄 생성</h1>
        <p className="text-gray-600">설문과 학급을 선택하여 여러 학생의 생기부를 한 번에 생성할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>생성 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">설문 선택</label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={status.inProgress}
              >
                <option value="">설문을 선택하세요</option>
                {surveys.map(survey => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">학급 선택</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={status.inProgress}
              >
                <option value="">학급을 선택하세요</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} ({cls.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">생기부 유형</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={status.inProgress}
              >
                <option value="교과학습발달상황">교과학습발달상황</option>
                <option value="창의적 체험활동 누가기록">창의적 체험활동 누가기록</option>
                <option value="행동특성 및 종합의견">행동특성 및 종합의견</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">교사 관찰 내용 (선택사항)</label>
              <textarea
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="학급 전체에 공통으로 적용할 관찰 내용을 입력하세요"
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
                disabled={status.inProgress}
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 mb-1">주의사항</p>
                  <ul className="text-amber-700 space-y-1">
                    <li>• 일괄 생성은 시간이 걸릴 수 있습니다</li>
                    <li>• 생성 중에는 페이지를 벗어나지 마세요</li>
                    <li>• 각 학생당 약 1-2초가 소요됩니다</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBatchGenerate} 
              disabled={status.inProgress || !selectedSurvey || !selectedClass}
              className="w-full"
              size="lg"
            >
              {status.inProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  일괄 생성 시작
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress and Results */}
        <Card>
          <CardHeader>
            <CardTitle>생성 진행 상황</CardTitle>
          </CardHeader>
          <CardContent>
            {status.total > 0 && (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>진행률</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{status.total}</div>
                      <div className="text-sm text-gray-500">전체</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{status.completed}</div>
                      <div className="text-sm text-gray-500">완료</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{status.failed}</div>
                      <div className="text-sm text-gray-500">실패</div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {status.results.map((result, index) => (
                      <div key={index} className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm">{result.studentName}</span>
                        {result.status === 'success' ? (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            완료
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50">
                            <XCircle className="h-3 w-3 mr-1 text-red-600" />
                            실패
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {!status.inProgress && status.total > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-center">
                      생성이 완료되었습니다. 
                      <Button
                        variant="link"
                        className="text-blue-600"
                        onClick={() => window.location.href = '/dashboard/records'}
                      >
                        생기부 관리 페이지
                      </Button>
                      에서 확인하세요.
                    </p>
                  </div>
                )}
              </>
            )}

            {status.total === 0 && !status.inProgress && (
              <div className="text-center py-8 text-gray-500">
                설문과 학급을 선택한 후 생성을 시작하세요.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}