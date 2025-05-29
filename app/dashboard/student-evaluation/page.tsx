'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { 
  User, 
  BookOpen, 
  FileText, 
  Search, 
  Calendar,
  Users,
  Sparkles,
  Eye
} from 'lucide-react'

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
  description: string
  evaluation_plans?: {
    subject: string
    grade: string
    semester: string
    unit: string
  }
  created_at: string
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

export default function StudentEvaluationPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<StudentResponse | null>(null)

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      setStudents(selectedClass.students || [])
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedStudent && selectedClass) {
      fetchStudentResponses()
    }
  }, [selectedStudent, selectedClass, fetchStudentResponses])

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

  const fetchStudentResponses = useCallback(async () => {
    if (!selectedStudent || !selectedClass) return

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [selectedStudent, selectedClass])

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.number.toString().includes(searchTerm)
  )

  const handleGenerateRecord = async (response: StudentResponse) => {
    // Navigate to record generation with pre-filled data
    const params = new URLSearchParams({
      studentName: response.student_name,
      className: selectedClass?.name || '',
      subject: response.survey.evaluation_plans?.subject || '',
      surveyId: response.survey.id,
      responseId: response.id
    })
    window.location.href = `/dashboard/records?${params.toString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">학생별 평가 현황</h1>
        <p className="mt-2 text-sm text-gray-600">
          학생들의 자기평가 결과를 확인하고 교과학습발달상황을 생성하세요.
        </p>
      </div>

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
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
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
              <User className="h-5 w-5" />
              학생 선택 - {selectedClass.name}
            </CardTitle>
            <CardDescription>
              평가 현황을 확인할 학생을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="학생 이름 또는 번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredStudents.map((student) => (
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
      )}

      {/* Student Responses */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedStudent.name} 학생의 자기평가 현황
            </CardTitle>
            <CardDescription>
              제출된 자기평가 설문 결과를 확인하고 교과학습발달상황을 생성하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">응답 데이터를 불러오는 중...</p>
              </div>
            ) : studentResponses.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  제출된 평가가 없습니다
                </h3>
                <p className="text-gray-500">
                  {selectedStudent.name} 학생이 아직 자기평가를 제출하지 않았습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentResponses.map((response) => (
                  <div key={response.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
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
                              {response.survey.evaluation_plans.grade}
                            </Badge>
                            <Badge variant="outline">
                              {response.survey.evaluation_plans.semester}
                            </Badge>
                            <Badge variant="outline">
                              {response.survey.evaluation_plans.unit}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(response.submitted_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedResponse(response)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        응답 보기
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateRecord(response)}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        교과학습발달상황 생성
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {selectedResponse.student_name} - {selectedResponse.survey.title}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedResponse(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Multiple Choice Responses */}
                {selectedResponse.responses.multipleChoice?.map((mcResponse, index) => (
                  <div key={`mc-${index}`} className="space-y-2">
                    <h4 className="font-medium text-gray-900">
                      {index + 1}. {mcResponse.question}
                    </h4>
                    <div className="ml-4 p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-900">
                        답변: {mcResponse.answer}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Short Answer Responses */}
                {selectedResponse.responses.shortAnswer?.map((saResponse, index) => (
                  <div key={`sa-${index}`} className="space-y-2">
                    <h4 className="font-medium text-gray-900">
                      {(selectedResponse.responses.multipleChoice?.length || 0) + index + 1}. {saResponse.question}
                    </h4>
                    <div className="ml-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-green-900 whitespace-pre-wrap">
                        {saResponse.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t">
              <Button
                onClick={() => handleGenerateRecord(selectedResponse)}
                className="w-full flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                이 응답으로 교과학습발달상황 생성하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}