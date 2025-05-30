'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { 
  User, 
  BookOpen, 
  FileText, 
  Target, 
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Student {
  number: number
  name: string
}

interface ClassInfo {
  id: string
  name: string
  school_code: string
  students: Student[]
}

interface Survey {
  id: string
  title: string
  evaluation_plans?: {
    subject: string
    grade: string
    semester: string
    unit: string
  }
}

interface StudentResponse {
  id: string
  student_name: string
  survey: Survey
  responses: {
    multipleChoice: Array<{
      question: string
      answer: string
    }>
    shortAnswer: Array<{
      question: string
      answer: string
    }>
  }
  submitted_at: string
}

interface GeneratedContent {
  content: string
  characterCount: number
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export default function GenerateRecordPage() {
  const { user } = useAuth()
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5
  
  // Data states
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([])
  const [selectedResponse, setSelectedResponse] = useState<StudentResponse | null>(null)
  
  // Evaluation data
  const [evaluationPlans, setEvaluationPlans] = useState<any[]>([])
  const [selectedEvaluationPlans, setSelectedEvaluationPlans] = useState<any[]>([])
  const [evaluationResults, setEvaluationResults] = useState<any[]>([])
  
  // Record generation
  const [recordType, setRecordType] = useState<string>('교과학습발달상황')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  
  // Loading states
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClasses(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchEvaluationPlans = async () => {
    try {
      const response = await fetch('/api/evaluations')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvaluationPlans(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation plans:', error)
      setEvaluationPlans([])
    }
  }

  const fetchEvaluationResults = useCallback(async (studentName: string, evaluationPlanIds?: string[]) => {
    if (!selectedClass || !studentName) return

    try {
      let url = `/api/evaluation-results?classId=${selectedClass.id}&studentName=${encodeURIComponent(studentName)}`
      if (evaluationPlanIds && evaluationPlanIds.length > 0) {
        url += `&evaluationPlanIds=${evaluationPlanIds.join(',')}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvaluationResults(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation results:', error)
      setEvaluationResults([])
    }
  }, [selectedClass])

  const fetchStudentResponses = useCallback(async () => {
    if (!selectedStudent || !selectedClass) return

    setIsLoadingResponses(true)
    try {
      const response = await fetch(
        `/api/teacher/responses?classId=${selectedClass.id}&studentName=${selectedStudent.name}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStudentResponses(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching student responses:', error)
    } finally {
      setIsLoadingResponses(false)
    }
  }, [selectedStudent, selectedClass])

  useEffect(() => {
    if (user) {
      fetchClasses()
      fetchEvaluationPlans()
    }
  }, [user])

  useEffect(() => {
    if (selectedStudent && selectedClass) {
      fetchStudentResponses()
      fetchEvaluationResults(selectedStudent.name)
    }
  }, [selectedStudent, selectedClass, fetchStudentResponses, fetchEvaluationResults])

  useEffect(() => {
    if (selectedStudent && selectedEvaluationPlans.length > 0) {
      fetchEvaluationResults(selectedStudent.name, selectedEvaluationPlans.map(p => p.id))
    }
  }, [selectedStudent, selectedEvaluationPlans, fetchEvaluationResults])

  const handleGenerateContent = async () => {
    if (!selectedStudent || !selectedClass || !teacherNotes.trim()) {
      alert('필수 정보를 모두 입력해주세요.')
      return
    }

    // 교과학습발달상황인 경우 평가 계획이나 과목 선택 확인
    if (recordType === '교과학습발달상황') {
      const hasSubject = selectedEvaluationPlans.length > 0 || 
                        selectedResponse?.survey.evaluation_plans?.subject || 
                        selectedSubject
      if (!hasSubject) {
        alert('교과학습발달상황 작성을 위해 평가 계획을 선택하거나 과목을 선택해주세요.')
        return
      }
    }

    setIsGenerating(true)
    try {
      // 생기부 생성에 필요한 모든 데이터 수집
      const requestData = {
        studentName: selectedStudent.name,
        className: selectedClass.name,
        recordType,
        subject: recordType === '교과학습발달상황' ? 
          (selectedEvaluationPlans.length > 0 ? selectedEvaluationPlans.map(p => p.subject).join(', ') : 
           selectedResponse?.survey.evaluation_plans?.subject || selectedSubject || '전과목') : undefined,
        teacherNotes,
        additionalContext,
        // 평가 계획 정보 추가 (여러 개)
        evaluationPlans: selectedEvaluationPlans,
        // 평가 결과 정보 추가
        evaluationResults: evaluationResults,
        // 학생 자기평가 정보
        studentResponse: selectedResponse
      }
      
      console.log('Generating record with data:', requestData)

      const response = await fetch('/api/records/generate-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedContent({
          content: data.content,
          characterCount: data.validation?.characterCount || data.content.length,
          isValid: data.validation?.isValid || false,
          warnings: data.validation?.issues?.filter((issue: string) => !issue.includes('초과')) || [],
          errors: data.validation?.issues?.filter((issue: string) => issue.includes('초과')) || []
        })
        setCurrentStep(5) // Move to final step
      } else {
        alert('생기부 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error generating content:', error)
      alert('생기부 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveRecord = async () => {
    if (!generatedContent || !selectedStudent || !selectedClass) return

    try {
      const response = await fetch('/api/records/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: selectedResponse?.id,
          recordType,
          content: generatedContent.content,
          metadata: {
            studentName: selectedStudent.name,
            className: selectedClass.name,
            subject: selectedResponse?.survey.evaluation_plans?.subject,
            unit: selectedResponse?.survey.evaluation_plans?.unit,
            teacherNotes,
            additionalContext
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('생기부가 저장되었습니다!')
        // Reset and go back to records list
        window.location.href = '/dashboard/records'
      } else {
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error saving record:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.content)
      alert('클립보드에 복사되었습니다!')
    }
  }

  const handleEvaluationPlanToggle = (plan: any) => {
    setSelectedEvaluationPlans(prev => {
      const isSelected = prev.some(p => p.id === plan.id)
      if (isSelected) {
        return prev.filter(p => p.id !== plan.id)
      } else {
        return [...prev, plan]
      }
    })
  }

  const canProceed = (step: number) => {
    switch (step) {
      case 1: return selectedClass !== null
      case 2: return selectedStudent !== null
      case 3: return true // 자기평가는 선택사항
      case 4: {
        const hasTeacherNotes = teacherNotes.trim() !== ''
        
        // 교과학습발달상황인 경우 평가 계획이나 과목 선택 필요
        if (recordType === '교과학습발달상황') {
          const hasSubject = selectedEvaluationPlans.length > 0 || 
                            selectedResponse?.survey.evaluation_plans?.subject || 
                            selectedSubject
          return hasTeacherNotes && hasSubject
        }
        
        return hasTeacherNotes
      }
      case 5: return generatedContent !== null
      default: return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                1단계: 학급 선택
              </CardTitle>
              <CardDescription>
                생기부를 작성할 학생이 속한 학급을 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {classes.map((classInfo) => (
                  <div 
                    key={classInfo.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedClass?.id === classInfo.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedClass(classInfo)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{classInfo.name}</div>
                        <div className="text-sm text-gray-500">
                          학생 수: {classInfo.students?.length || 0}명
                        </div>
                      </div>
                      <Badge variant="outline">
                        {classInfo.school_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                2단계: 학생 선택 - {selectedClass?.name}
              </CardTitle>
              <CardDescription>
                생기부를 작성할 학생을 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedClass?.students?.map((student) => (
                  <div
                    key={student.number}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStudent?.number === student.number
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{student.number}번</div>
                      <div className="font-medium">{student.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                3단계: 자기평가 선택 (선택) - {selectedStudent?.name}
              </CardTitle>
              <CardDescription>
                생기부 작성에 활용할 자기평가 결과를 선택하세요. 자기평가 없이도 생기부 생성이 가능합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingResponses ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">응답 데이터를 불러오는 중...</p>
                </div>
              ) : studentResponses.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    제출된 평가가 없습니다
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {selectedStudent?.name} 학생이 아직 자기평가를 제출하지 않았습니다.
                  </p>
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    💡 자기평가가 없어도 교사 관찰 기록과 평가 기준을 바탕으로 생기부를 생성할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 선택 안함 옵션 */}
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedResponse === null
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedResponse(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-700">
                          자기평가 없이 생성
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          교사 관찰 기록과 평가 기준만으로 생기부를 생성합니다
                        </p>
                      </div>
                      {selectedResponse === null && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* 자기평가 목록 */}
                  {studentResponses.map((response) => (
                    <div 
                      key={response.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedResponse?.id === response.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedResponse(response)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            {response.survey.title}
                          </h4>
                          {response.survey.evaluation_plans && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="secondary">
                                {response.survey.evaluation_plans.subject}
                              </Badge>
                              <Badge variant="outline">
                                {response.survey.evaluation_plans.unit}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(response.submitted_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                4단계: 추가 정보 입력
              </CardTitle>
              <CardDescription>
                AI가 더 정확한 생기부를 작성할 수 있도록 추가 정보를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Record Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="recordType">작성할 생기부 항목</Label>
                <div className="grid gap-3">
                  {[
                    '교과학습발달상황',
                    '창의적 체험활동 누가기록',
                    '행동특성 및 종합의견'
                  ].map((type) => (
                    <div
                      key={type}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        recordType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setRecordType(type)}
                    >
                      <div className="font-medium">{type}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation Plan Selection (for 교과학습발달상황) */}
              {recordType === '교과학습발달상황' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="evaluationPlan">평가 계획 선택 (복수 선택 가능)</Label>
                    
                    {evaluationPlans.length > 0 ? (
                      <div className="space-y-2">
                        {evaluationPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              selectedEvaluationPlans.some(p => p.id === plan.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedEvaluationPlans.some(p => p.id === plan.id)}
                                onCheckedChange={() => handleEvaluationPlanToggle(plan)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  <Target className="h-4 w-4 text-blue-600" />
                                  {plan.subject} - {plan.unit}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="secondary">{plan.grade}</Badge>
                                  <Badge variant="outline">{plan.semester}</Badge>
                                </div>
                                {plan.learning_objectives && Array.isArray(plan.learning_objectives) && plan.learning_objectives.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    목표: {plan.learning_objectives.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="mb-4">등록된 평가계획이 없습니다.</p>
                        <p className="text-sm">평가계획을 먼저 등록하거나 아래에서 직접 과목을 선택하세요.</p>
                      </div>
                    )}

                    {/* Selected Plans Summary */}
                    {selectedEvaluationPlans.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          선택된 평가계획 ({selectedEvaluationPlans.length}개)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvaluationPlans.map((plan) => (
                            <Badge key={plan.id} variant="default" className="text-xs">
                              {plan.subject} - {plan.unit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subject Selection (when no evaluation plan) */}
                  {selectedEvaluationPlans.length === 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subject">과목 선택</Label>
                      <select
                        id="subject"
                        value={selectedResponse?.survey.evaluation_plans?.subject || selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value)
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                        disabled={!!selectedResponse?.survey.evaluation_plans?.subject}
                      >
                        <option value="">과목을 선택하세요</option>
                        <option value="국어">국어</option>
                        <option value="수학">수학</option>
                        <option value="사회">사회</option>
                        <option value="과학">과학</option>
                        <option value="영어">영어</option>
                        <option value="도덕">도덕</option>
                        <option value="실과">실과</option>
                        <option value="체육">체육</option>
                        <option value="음악">음악</option>
                        <option value="미술">미술</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Evaluation Results Summary */}
                  {evaluationResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>해당 학생의 평가 결과</Label>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>매우잘함: {evaluationResults.filter(r => r.result === '매우잘함').length}개</div>
                          <div>잘함: {evaluationResults.filter(r => r.result === '잘함').length}개</div>
                          <div>보통: {evaluationResults.filter(r => r.result === '보통').length}개</div>
                          <div>노력요함: {evaluationResults.filter(r => r.result === '노력요함').length}개</div>
                        </div>
                        {evaluationResults.filter(r => r.result === '매우잘함' || r.result === '잘함').length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-gray-600 font-medium mb-1">우수 성취:</p>
                            {evaluationResults
                              .filter(r => r.result === '매우잘함' || r.result === '잘함')
                              .slice(0, 3)
                              .map((r, idx) => (
                                <p key={idx} className="text-xs text-gray-600">
                                  • {r.evaluation_name}: {r.result}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {recordType !== '교과학습발달상황' && selectedResponse?.survey.evaluation_plans?.subject && (
                <p className="text-sm text-gray-500">
                  선택된 자기평가 설문의 과목({selectedResponse.survey.evaluation_plans.subject})이 자동으로 적용됩니다.
                </p>
              )}

              {/* Teacher Notes */}
              <div className="space-y-2">
                <Label htmlFor="teacherNotes">교사 관찰 기록 (필수)</Label>
                <Textarea
                  id="teacherNotes"
                  placeholder="수업 중 관찰한 학생의 모습, 특별한 활동, 성장한 부분 등을 구체적으로 입력하세요..."
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  구체적이고 객관적인 관찰 내용을 입력할수록 더 좋은 생기부가 생성됩니다.
                </p>
              </div>

              {/* Additional Context */}
              <div className="space-y-2">
                <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
                <Textarea
                  id="additionalContext"
                  placeholder="특별한 프로젝트, 학급 분위기, 개별 학생 특성 등 추가로 고려할 사항이 있다면 입력하세요..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Selected Data Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">선택된 정보 요약</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">학생:</span> {selectedStudent?.name}</div>
                  <div><span className="font-medium">학급:</span> {selectedClass?.name}</div>
                  <div><span className="font-medium">생기부 항목:</span> {recordType}</div>
                  
                  {/* 평가계획 정보 */}
                  {recordType === '교과학습발달상황' && (
                    <div>
                      <span className="font-medium">평가계획:</span>{' '}
                      {selectedEvaluationPlans.length > 0 ? (
                        <span>
                          {selectedEvaluationPlans.map(p => `${p.subject}-${p.unit}`).join(', ')} 
                          ({selectedEvaluationPlans.length}개 선택)
                        </span>
                      ) : selectedSubject ? (
                        <span>{selectedSubject} (직접 입력)</span>
                      ) : selectedResponse?.survey.evaluation_plans ? (
                        <span>{selectedResponse.survey.evaluation_plans.subject} - {selectedResponse.survey.evaluation_plans.unit} (설문 연계)</span>
                      ) : (
                        <span className="text-orange-600">미선택</span>
                      )}
                    </div>
                  )}
                  
                  {/* 자기평가 정보 */}
                  {selectedResponse ? (
                    <div><span className="font-medium">자기평가:</span> {selectedResponse.survey.title}</div>
                  ) : (
                    <div className="text-gray-500 italic">자기평가 미선택 (교사 관찰 기록으로만 생성)</div>
                  )}
                  
                  {/* 평가결과 요약 */}
                  {evaluationResults.length > 0 && (
                    <div>
                      <span className="font-medium">평가결과:</span> 총 {evaluationResults.length}개 
                      (매우잘함 {evaluationResults.filter(r => r.result === '매우잘함').length}개, 
                      잘함 {evaluationResults.filter(r => r.result === '잘함').length}개)
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                5단계: 생기부 생성 결과
              </CardTitle>
              <CardDescription>
                AI가 생성한 생기부를 검토하고 저장하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isGenerating ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    AI가 생기부를 작성하고 있습니다...
                  </h3>
                  <p className="text-gray-500">
                    잠시만 기다려주세요. 평가 결과를 분석하여 맞춤형 생기부를 생성하고 있습니다.
                  </p>
                </div>
              ) : generatedContent ? (
                <div className="space-y-4">
                  {/* Validation Status */}
                  <div className={`p-4 rounded-lg ${
                    generatedContent.isValid 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {generatedContent.isValid ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        generatedContent.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        NEIS 규정 {generatedContent.isValid ? '준수' : '위반'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>글자 수: {generatedContent.characterCount}/500자</div>
                      {generatedContent.warnings.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium text-orange-800">경고:</div>
                          <ul className="list-disc list-inside text-orange-700">
                            {generatedContent.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {generatedContent.errors.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium text-red-800">오류:</div>
                          <ul className="list-disc list-inside text-red-700">
                            {generatedContent.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generated Content */}
                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">생성된 {recordType}</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyToClipboard}
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            복사
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateContent}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            재생성
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {generatedContent.content}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveRecord}
                      className="flex-1 flex items-center gap-2"
                      disabled={!generatedContent.isValid}
                    >
                      <Download className="h-4 w-4" />
                      생기부 저장하기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedContent(null)
                        setCurrentStep(4)
                      }}
                    >
                      수정하기
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Button
                    onClick={handleGenerateContent}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    AI 생기부 생성하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">생기부 생성</h1>
        <p className="mt-2 text-sm text-gray-600">
          학생의 자기평가 결과를 바탕으로 AI가 생활기록부를 작성해드립니다.
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">진행 상황</span>
            <span className="text-sm text-gray-500">{currentStep} / {totalSteps}</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>학급선택</span>
            <span>학생선택</span>
            <span>평가선택</span>
            <span>정보입력</span>
            <span>생성완료</span>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        
        <Button
          onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps || !canProceed(currentStep)}
          className="flex items-center gap-2"
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}