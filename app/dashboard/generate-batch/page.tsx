'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { 
  Users, 
  BookOpen, 
  Target, 
  Sparkles,
  Check,
  AlertCircle,
  Download,
  X,
  Loader2,
  FileText
} from 'lucide-react'

interface Student {
  number: number
  name: string
  selected?: boolean
}

interface ClassInfo {
  id: string
  name: string
  school_code: string
  students: Student[]
}

interface GenerationProgress {
  total: number
  completed: number
  current: string
  errors: string[]
  results: Array<{
    studentName: string
    content: string
    success: boolean
    error?: string
  }>
}

export default function GenerateBatchPage() {
  const { user } = useAuth()
  
  // States
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [recordType, setRecordType] = useState<string>('교과학습발달상황')
  const [subject, setSubject] = useState<string>('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  
  // Generation states
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      const studentsWithSelection = selectedClass.students.map(s => ({ ...s, selected: true }))
      setStudents(studentsWithSelection)
      setSelectedStudents(new Set(studentsWithSelection.map(s => s.number)))
    }
  }, [selectedClass])

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

  const toggleStudent = (studentNumber: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentNumber)) {
      newSelected.delete(studentNumber)
    } else {
      newSelected.add(studentNumber)
    }
    setSelectedStudents(newSelected)
  }

  const toggleAllStudents = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.number)))
    }
  }

  const handleBatchGenerate = async () => {
    if (!selectedClass || selectedStudents.size === 0) {
      alert('학급과 학생을 선택해주세요.')
      return
    }

    if (recordType === '교과학습발달상황' && !subject) {
      alert('과목을 선택해주세요.')
      return
    }

    if (!teacherNotes.trim()) {
      alert('교사 관찰 기록을 입력해주세요.')
      return
    }

    setIsGenerating(true)
    setProgress({
      total: selectedStudents.size,
      completed: 0,
      current: '',
      errors: [],
      results: []
    })

    const selectedStudentsList = students.filter(s => selectedStudents.has(s.number))

    // 순차적으로 학생별 생기부 생성
    for (let i = 0; i < selectedStudentsList.length; i++) {
      const student = selectedStudentsList[i]
      
      setProgress(prev => ({
        ...prev!,
        current: student.name
      }))

      try {
        const response = await fetch('/api/records/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentName: student.name,
            className: selectedClass.name,
            recordType,
            teacherNotes,
            additionalContext,
            subject: recordType === '교과학습발달상황' ? subject : undefined,
            // 일괄 생성에서는 자기평가 없이 진행
            responseId: null,
            responses: null
          })
        })

        const data = await response.json()

        if (data.success) {
          setProgress(prev => ({
            ...prev!,
            completed: i + 1,
            results: [...prev!.results, {
              studentName: student.name,
              content: data.content,
              success: true
            }]
          }))
        } else {
          setProgress(prev => ({
            ...prev!,
            completed: i + 1,
            errors: [...prev!.errors, `${student.name}: ${data.error}`],
            results: [...prev!.results, {
              studentName: student.name,
              content: '',
              success: false,
              error: data.error
            }]
          }))
        }
      } catch (error) {
        setProgress(prev => ({
          ...prev!,
          completed: i + 1,
          errors: [...prev!.errors, `${student.name}: ${error}`],
          results: [...prev!.results, {
            studentName: student.name,
            content: '',
            success: false,
            error: String(error)
          }]
        }))
      }

      // API 속도 제한을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setIsGenerating(false)
    setShowResults(true)
  }

  const exportResults = () => {
    if (!progress) return

    const successfulResults = progress.results.filter(r => r.success)
    let exportContent = `[${selectedClass?.name} ${recordType}]\n`
    exportContent += `생성일시: ${new Date().toLocaleString('ko-KR')}\n\n`

    successfulResults.forEach(result => {
      exportContent += `[${result.studentName}]\n`
      exportContent += `${result.content}\n\n`
      exportContent += '---\n\n'
    })

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedClass?.name}_${recordType}_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canGenerate = selectedClass && selectedStudents.size > 0 && teacherNotes.trim() && 
    (recordType !== '교과학습발달상황' || subject)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">생기부 일괄 생성</h1>
        <p className="mt-2 text-sm text-gray-600">
          학급 전체 또는 선택한 학생들의 생기부를 한 번에 생성합니다.
        </p>
      </div>

      {!showResults ? (
        <>
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                학급 선택
              </CardTitle>
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

          {/* Student Selection */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  학생 선택 - {selectedClass.name}
                </CardTitle>
                <CardDescription>
                  생기부를 생성할 학생들을 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Select All */}
                <div className="mb-4 pb-4 border-b">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedStudents.size === students.length}
                      onCheckedChange={toggleAllStudents}
                    />
                    <span className="font-medium">전체 선택 ({students.length}명)</span>
                  </label>
                </div>

                {/* Student List */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {students.map((student) => (
                    <label
                      key={student.number}
                      className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.number)}
                        onCheckedChange={() => toggleStudent(student.number)}
                      />
                      <span className="text-sm">
                        {student.number}번 {student.name}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  {selectedStudents.size}명 선택됨
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generation Settings */}
          {selectedClass && selectedStudents.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  생성 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Record Type */}
                <div className="space-y-3">
                  <Label>작성할 생기부 항목</Label>
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

                {/* Subject Selection (for 교과학습발달상황) */}
                {recordType === '교과학습발달상황' && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      과목 <Badge variant="destructive" className="text-xs ml-1">필수</Badge>
                    </Label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">선택하세요</option>
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

                {/* Teacher Notes */}
                <div className="space-y-2">
                  <Label htmlFor="teacherNotes">
                    교사 관찰 기록 (전체 학생 공통) <Badge variant="destructive" className="text-xs ml-1">필수</Badge>
                  </Label>
                  <Textarea
                    id="teacherNotes"
                    placeholder="수업 중 관찰한 학급 전체의 모습, 공통된 활동 내용 등을 입력하세요..."
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-sm text-gray-500">
                    학급 전체에 공통으로 적용될 관찰 내용을 입력하세요. AI가 각 학생별로 개별화된 내용을 생성합니다.
                  </p>
                </div>

                {/* Additional Context */}
                <div className="space-y-2">
                  <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
                  <Textarea
                    id="additionalContext"
                    placeholder="특별한 프로젝트, 학급 특성 등 추가로 고려할 사항이 있다면 입력하세요..."
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleBatchGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      일괄 생성 시작 ({selectedStudents.size}명)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isGenerating && progress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  생성 진행 중
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>진행률: {progress.completed}/{progress.total}</span>
                    <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                  </div>
                  <Progress value={(progress.completed / progress.total) * 100} />
                </div>

                {progress.current && (
                  <div className="text-sm text-gray-600">
                    현재 생성 중: {progress.current}
                  </div>
                )}

                {progress.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    오류 발생: {progress.errors.length}건
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Results */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              생성 결과
            </CardTitle>
            <CardDescription>
              {progress?.results.filter(r => r.success).length}명 성공, {progress?.errors.length}명 실패
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {progress?.results.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-gray-600">성공</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {progress?.errors.length}
                  </div>
                  <div className="text-sm text-gray-600">실패</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {progress?.total}
                  </div>
                  <div className="text-sm text-gray-600">전체</div>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {progress?.results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{result.studentName}</div>
                    {result.success ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  {result.success && (
                    <div className="text-sm text-gray-700 line-clamp-3">
                      {result.content}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm text-red-600">
                      오류: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={exportResults}
                className="flex-1 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                결과 내보내기
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResults(false)
                  setProgress(null)
                }}
              >
                새로 생성
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}