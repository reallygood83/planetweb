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
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import KeywordCheckboxSystem from '@/components/observation/KeywordCheckboxSystem'
import { StudentObservation } from '@/lib/types/observation-system'

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
  
  // 관찰 기록 관련 상태
  const [observationRecords, setObservationRecords] = useState<any[]>([])
  const [hasObservationRecords, setHasObservationRecords] = useState(false)
  const [useObservationRecords, setUseObservationRecords] = useState(true)
  
  // 실시간 키워드 선택 (메모리에서만 사용, DB 저장 안함)
  const [showRealtimeKeywords, setShowRealtimeKeywords] = useState(false)
  const [realtimeKeywordObservation, setRealtimeKeywordObservation] = useState<StudentObservation | null>(null)
  
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

  // 관찰 기록 조회 함수
  const fetchObservationRecords = useCallback(async () => {
    if (!selectedStudent || !selectedClass) return

    try {
      const response = await fetch(
        `/api/observations/save-session?class_id=${selectedClass.id}&student_name=${selectedStudent.name}&limit=30`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.sessions) {
          setObservationRecords(data.sessions)
          setHasObservationRecords(data.sessions.length > 0)
        } else {
          setObservationRecords([])
          setHasObservationRecords(false)
        }
      }
    } catch (error) {
      console.error('관찰 기록 조회 오류:', error)
      setObservationRecords([])
      setHasObservationRecords(false)
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
      fetchObservationRecords()
    }
  }, [selectedStudent, selectedClass, fetchStudentResponses, fetchEvaluationResults, fetchObservationRecords])

  useEffect(() => {
    if (selectedStudent && selectedEvaluationPlans.length > 0) {
      fetchEvaluationResults(selectedStudent.name, selectedEvaluationPlans.map(p => p.id))
    }
  }, [selectedStudent, selectedEvaluationPlans, fetchEvaluationResults])

  // 실시간 키워드를 관찰 기록 형태로 변환
  const createSyntheticObservationRecords = () => {
    if (!realtimeKeywordObservation || realtimeKeywordObservation.selected_keywords.length === 0) {
      return []
    }

    return [{
      session_date: new Date().toISOString().split('T')[0],
      subject: selectedSubject || selectedEvaluationPlans.map(p => p.subject).join(', ') || '전과목',
      lesson_topic: '실시간 관찰',
      student_name: selectedStudent?.name || '',
      students_data: [{
        student_name: selectedStudent?.name || '',
        selected_keywords: realtimeKeywordObservation.selected_keywords,
        additional_notes: realtimeKeywordObservation.additional_notes
      }]
    }]
  }

  const handleRealtimeKeywordObservationChange = (observation: StudentObservation) => {
    setRealtimeKeywordObservation(observation)
  }

  const handleGenerateContent = async () => {
    // 기본 검증
    if (!selectedStudent || !selectedClass) {
      alert('학생과 학급을 선택해주세요.')
      return
    }

    // 관찰 데이터 확인 (기존 DB 관찰 기록 또는 실시간 키워드)
    const hasTeacherNotes = teacherNotes.trim() !== ''
    const hasRealtimeKeywords = realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0
    const hasObservationData = (hasObservationRecords && useObservationRecords) || hasRealtimeKeywords
    
    // 교사 관찰 기록 또는 관찰 데이터 중 하나는 있어야 함
    if (!hasTeacherNotes && !hasObservationData) {
      alert('교사 관찰 기록을 입력하거나 실시간 키워드를 선택해주세요.')
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
        studentResponse: selectedResponse,
        // 관찰 기록 정보 추가 (기존 DB 관찰 기록 + 실시간 키워드)
        observationRecords: useObservationRecords ? [...observationRecords, ...createSyntheticObservationRecords()] : createSyntheticObservationRecords(),
        useObservationRecords: useObservationRecords || (realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0)
      }
      
      console.log('Generating record with data:', requestData)

      // 모든 경우에 generate-simple API 사용 (관찰 기록 지원 추가됨)
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
      case 3: {
        // 3단계: 추가 정보 입력
        const hasTeacherNotes = teacherNotes.trim() !== ''
        const hasRealtimeKeywords = realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0
        const hasObservationData = (hasObservationRecords && useObservationRecords) || hasRealtimeKeywords
        
        // 교사 관찰 기록 또는 실시간 키워드 중 하나는 있어야 함
        const hasObservationContent = hasTeacherNotes || hasObservationData
        
        // 교과학습발달상황인 경우 평가 계획이나 과목 선택 필요
        if (recordType === '교과학습발달상황') {
          const hasSubject = selectedEvaluationPlans.length > 0 || 
                            selectedResponse?.survey.evaluation_plans?.subject || 
                            selectedSubject
          return hasObservationContent && hasSubject
        }
        
        return hasObservationContent
      }
      case 4: return true // 자기평가는 선택사항
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
                <Target className="h-5 w-5" />
                3단계: 추가 정보 입력
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
                      <Label htmlFor="subject">과목 직접 입력</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['국어', '수학', '사회', '과학', '영어', '체육', '음악', '미술', '실과', '도덕', '창체'].map((subj) => (
                          <div
                            key={subj}
                            className={`p-2 text-center rounded border cursor-pointer transition-colors ${
                              selectedSubject === subj
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedSubject(selectedSubject === subj ? '' : subj)}
                          >
                            <span className="text-sm font-medium">{subj}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Custom Subject Input */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-500">기타:</span>
                        <input
                          type="text"
                          placeholder="직접 입력"
                          value={selectedSubject && !['국어', '수학', '사회', '과학', '영어', '체육', '음악', '미술', '실과', '도덕', '창체'].includes(selectedSubject) ? selectedSubject : ''}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Observation Records Section */}
              {hasObservationRecords && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h4 className="font-medium text-blue-900">키워드 기반 관찰 기록 발견!</h4>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {observationRecords.length}개 세션
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-blue-700">
                      &ldquo;{selectedStudent?.name}&rdquo; 학생에 대한 체크박스 기반 관찰 기록이 있습니다. 
                      이 데이터를 생기부 작성에 활용하시겠습니까?
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useObservationRecords"
                        checked={useObservationRecords}
                        onCheckedChange={(checked) => setUseObservationRecords(checked as boolean)}
                      />
                      <Label htmlFor="useObservationRecords" className="text-sm font-medium cursor-pointer">
                        관찰 기록 데이터를 생기부 작성에 포함
                      </Label>
                    </div>
                    
                    {useObservationRecords && (
                      <div className="space-y-2">
                        <p className="text-xs text-blue-600 font-medium">포함될 관찰 기록:</p>
                        <div className="space-y-1">
                          {observationRecords.slice(0, 3).map((session: any, idx: number) => (
                            <div key={idx} className="text-xs text-blue-600 pl-2 border-l-2 border-blue-300">
                              • {session.session_date} - {session.subject || '전과목'} ({session.lesson_topic || '수업 관찰'})
                            </div>
                          ))}
                          {observationRecords.length > 3 && (
                            <div className="text-xs text-blue-500 pl-2">
                              ... 외 {observationRecords.length - 3}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Keyword Selection (Memory Only) */}
              {selectedStudent && (
                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <h4 className="font-medium text-yellow-900">실시간 키워드 관찰 (생성용)</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-yellow-700">저장되지 않음</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRealtimeKeywords(!showRealtimeKeywords)}
                      >
                        {showRealtimeKeywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-yellow-700">
                      생기부 생성을 위한 임시 키워드 선택입니다. 데이터베이스에 저장되지 않으며, 
                      현재 생성 과정에서만 활용됩니다.
                    </p>
                    
                    {showRealtimeKeywords && (
                      <div className="bg-white rounded-lg p-4 border">
                        <KeywordCheckboxSystem
                          studentName={selectedStudent.name}
                          onObservationChange={handleRealtimeKeywordObservationChange}
                          initialData={realtimeKeywordObservation || undefined}
                        />
                      </div>
                    )}
                    
                    {realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0 && (
                      <div className="text-xs text-yellow-600">
                        ✓ {realtimeKeywordObservation.selected_keywords.length}개 키워드 선택됨
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Teacher Notes */}
              <div className="space-y-2">
                <Label htmlFor="teacherNotes">
                  교사 관찰 기록 {(hasObservationRecords && useObservationRecords) || (realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0) ? '(선택)' : '*'}
                </Label>
                <Textarea
                  id="teacherNotes"
                  placeholder={
                    (hasObservationRecords && useObservationRecords) || (realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0)
                    ? "키워드 기반 관찰 기록 외에 추가로 기록하고 싶은 관찰 내용이 있다면 입력하세요...\n\n예시:\n- 최근 수학에 대한 관심이 높아져 추가 문제를 요청함\n- 발표할 때 자신감이 크게 향상됨" 
                    : "학생의 구체적인 학습 활동, 행동 관찰 내용, 성취 수준 등을 입력하세요...\n\n예시:\n- 수학 시간에 분수 덧셈 문제를 스스로 해결하려고 노력함\n- 모둠 활동 시 친구들의 의견을 경청하고 자신의 생각을 논리적으로 표현함\n- 어려운 문제를 만나도 포기하지 않고 끝까지 시도하는 끈기를 보임"
                  }
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {(hasObservationRecords && useObservationRecords) || (realtimeKeywordObservation && realtimeKeywordObservation.selected_keywords.length > 0)
                    ? "키워드 기반 관찰 기록이 자동으로 포함됩니다. 추가 관찰 내용이 있으면 입력하세요."
                    : "* 구체적이고 객관적인 관찰 내용을 입력하면 더 정확한 생기부가 생성됩니다."
                  }
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
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                4단계: 자기평가 선택 (선택) - {selectedStudent?.name}
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