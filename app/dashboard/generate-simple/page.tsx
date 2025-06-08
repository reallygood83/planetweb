'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { 
  User, 
  BookOpen, 
  Target, 
  Sparkles,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp
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
  class_name: string
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

export default function GenerateSimplePage() {
  const { user } = useAuth()
  
  // Core states
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([])
  const [selectedResponse, setSelectedResponse] = useState<StudentResponse | null>(null)
  
  // Record generation inputs
  const [recordType, setRecordType] = useState<string>('교과학습발달상황')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  
  // Real-time keyword selection (memory only)
  const [showKeywordSection, setShowKeywordSection] = useState(false)
  const [keywordObservation, setKeywordObservation] = useState<StudentObservation | null>(null)
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  
  // Evaluation plans
  const [evaluationPlans, setEvaluationPlans] = useState<any[]>([])
  const [selectedEvaluationPlans, setSelectedEvaluationPlans] = useState<any[]>([])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const result = await response.json()
        console.log('학급 조회 응답:', result)
        // API 응답 구조에 맞게 수정
        setClasses(result.data || result.classes || [])
      } else {
        console.error('학급 조회 실패:', response.status)
        const errorData = await response.json()
        console.error('오류 상세:', errorData)
        alert('학급 목록을 불러올 수 없습니다: ' + (errorData.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('학급 조회 오류:', error)
      alert('학급 목록 조회 중 오류가 발생했습니다.')
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

  const fetchStudentResponses = useCallback(async () => {
    if (!selectedStudent || !selectedClass) return

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
    }
  }, [selectedStudent, selectedClass, fetchStudentResponses])

  const handleGenerateContent = async () => {
    // Basic validation
    if (!selectedStudent || !selectedClass) {
      alert('학생과 학급을 선택해주세요.')
      return
    }

    // Check if we have sufficient input
    const hasTeacherNotes = teacherNotes.trim() !== ''
    const hasKeywordData = keywordObservation && keywordObservation.selected_keywords.length > 0
    
    if (!hasTeacherNotes && !hasKeywordData) {
      alert('교사 관찰 기록을 입력하거나 키워드를 선택해주세요.')
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
      // Create synthetic observation records from keyword selection
      const syntheticObservationRecords = keywordObservation ? [{
        session_date: new Date().toISOString().split('T')[0],
        subject: selectedSubject || '전과목',
        lesson_topic: '실시간 관찰',
        student_name: selectedStudent.name,
        students_data: [{
          student_name: selectedStudent.name,
          selected_keywords: keywordObservation.selected_keywords,
          additional_notes: keywordObservation.additional_notes
        }]
      }] : []

      const requestData = {
        studentName: selectedStudent.name,
        className: selectedClass.class_name,
        recordType,
        subject: recordType === '교과학습발달상황' ? 
          (selectedEvaluationPlans.length > 0 ? selectedEvaluationPlans.map(p => p.subject).join(', ') : 
           selectedResponse?.survey.evaluation_plans?.subject || selectedSubject || '전과목') : undefined,
        teacherNotes,
        additionalContext,
        evaluationPlans: selectedEvaluationPlans,
        studentResponse: selectedResponse,
        observationRecords: syntheticObservationRecords,
        useObservationRecords: syntheticObservationRecords.length > 0
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

  const handleKeywordObservationChange = (observation: StudentObservation) => {
    setKeywordObservation(observation)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">간편 생기부 생성</h1>
        <p className="mt-2 text-sm text-gray-600">
          한 페이지에서 모든 정보를 입력하고 즉시 생기부를 생성하세요.
        </p>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Class and Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                학급 및 학생 선택
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Class Selection */}
              <div>
                <Label htmlFor="class-select">학급</Label>
                <select
                  id="class-select"
                  value={selectedClass?.id || ''}
                  onChange={(e) => {
                    const selected = classes.find(c => c.id === e.target.value)
                    setSelectedClass(selected || null)
                    setSelectedStudent(null)
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
                >
                  <option value="">학급을 선택하세요</option>
                  {classes.map((classInfo) => (
                    <option key={classInfo.id} value={classInfo.id}>
                      {classInfo.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              {selectedClass && (
                <div>
                  <Label htmlFor="student-select">학생</Label>
                  <select
                    id="student-select"
                    value={selectedStudent?.name || ''}
                    onChange={(e) => {
                      const selected = selectedClass.students?.find(s => s.name === e.target.value)
                      setSelectedStudent(selected || null)
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="">학생을 선택하세요</option>
                    {selectedClass.students?.map((student) => (
                      <option key={student.number} value={student.name}>
                        {student.number}번 {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Record Type and Subject */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                생기부 항목 및 과목
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Record Type */}
              <div>
                <Label>작성할 생기부 항목</Label>
                <div className="grid gap-2 mt-2">
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

              {/* Subject Selection (for 교과학습발달상황) */}
              {recordType === '교과학습발달상황' && (
                <div className="space-y-4">
                  {/* Evaluation Plans */}
                  {evaluationPlans.length > 0 && (
                    <div>
                      <Label>평가 계획 선택 (복수 선택 가능)</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {evaluationPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`p-2 rounded border transition-colors ${
                              selectedEvaluationPlans.some(p => p.id === plan.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedEvaluationPlans.some(p => p.id === plan.id)}
                                onCheckedChange={() => handleEvaluationPlanToggle(plan)}
                              />
                              <div className="text-sm">
                                <div className="font-medium">{plan.subject} - {plan.unit}</div>
                                <div className="text-xs text-gray-500">{plan.grade} {plan.semester}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Subject Input */}
                  {selectedEvaluationPlans.length === 0 && (
                    <div>
                      <Label htmlFor="subject">과목 선택</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
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
                      
                      <div className="mt-2">
                        <Input
                          placeholder="기타 과목 직접 입력"
                          value={selectedSubject && !['국어', '수학', '사회', '과학', '영어', '체육', '음악', '미술', '실과', '도덕', '창체'].includes(selectedSubject) ? selectedSubject : ''}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Self-Assessment Selection */}
          {selectedStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  자기평가 선택 (선택사항)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentResponses.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>제출된 자기평가가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div 
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedResponse === null
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedResponse(null)}
                    >
                      <div className="font-medium text-sm">자기평가 없이 생성</div>
                    </div>
                    
                    {studentResponses.map((response) => (
                      <div 
                        key={response.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedResponse?.id === response.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedResponse(response)}
                      >
                        <div className="font-medium text-sm">{response.survey.title}</div>
                        {response.survey.evaluation_plans && (
                          <div className="text-xs text-gray-500 mt-1">
                            {response.survey.evaluation_plans.subject} - {response.survey.evaluation_plans.unit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Observation and Generation */}
        <div className="space-y-6">
          {/* Real-time Keyword Selection */}
          {selectedStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    실시간 키워드 관찰
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKeywordSection(!showKeywordSection)}
                  >
                    {showKeywordSection ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </CardTitle>
                <CardDescription>
                  생기부 생성을 위한 임시 키워드 선택 (저장되지 않음)
                </CardDescription>
              </CardHeader>
              {showKeywordSection && (
                <CardContent>
                  <KeywordCheckboxSystem
                    studentName={selectedStudent.name}
                    onObservationChange={handleKeywordObservationChange}
                    initialData={keywordObservation || undefined}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* Teacher Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                교사 관찰 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="학생의 구체적인 학습 활동, 행동 관찰 내용, 성취 수준 등을 입력하세요..."
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Additional Context */}
          <Card>
            <CardHeader>
              <CardTitle>추가 맥락 (선택)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="특별한 프로젝트, 학급 분위기, 개별 학생 특성 등 추가로 고려할 사항..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerateContent}
                disabled={isGenerating || !selectedStudent}
                className="w-full flex items-center gap-2"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                {isGenerating ? 'AI 생기부 생성 중...' : 'AI 생기부 생성하기'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              생성된 {recordType}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <h4 className="font-medium">생성된 내용</h4>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}