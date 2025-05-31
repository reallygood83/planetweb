'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, FileText, Sparkles, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ActivitySelector from '@/components/creative-activities/ActivitySelector'

interface Student {
  number: number
  name: string
}

interface ClassInfo {
  id: string
  class_name: string
  students: (string | Student)[]
}

export default function GenerateCreativeActivityPage() {
  const router = useRouter()
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([])
  const [teacherNotes, setTeacherNotes] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [semester, setSemester] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return month >= 3 && month <= 8 ? `${year}-1` : `${year}-2`
  })

  useEffect(() => {
    fetchClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: classesData, error } = await supabase
        .from('classes')
        .select('id, class_name, students')
        .eq('user_id', user.id)
        .order('class_name', { ascending: true })

      if (error) throw error

      setClasses(classesData || [])
      
      if (classesData && classesData.length > 0) {
        setSelectedClassId(classesData[0].id)
        if (classesData[0].students && classesData[0].students.length > 0) {
          const firstStudent = classesData[0].students[0]
          setSelectedStudent(typeof firstStudent === 'string' ? firstStudent : firstStudent.name)
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedClassId || !selectedStudent || selectedActivityIds.length === 0) {
      alert('학급, 학생, 그리고 활동을 선택해주세요.')
      return
    }

    setIsGenerating(true)
    setGeneratedContent('')
    
    try {
      // 암호화된 API 키 가져오기 및 복호화
      const encryptedKey = localStorage.getItem('gemini_api_key')
      if (!encryptedKey) {
        alert('API 키가 설정되지 않았습니다. 대시보드에서 설정해주세요.')
        return
      }

      // 복호화
      const { decryptApiKey } = await import('@/lib/utils')
      const apiKey = decryptApiKey(encryptedKey, process.env.NEXT_PUBLIC_ENCRYPT_KEY!)

      const response = await fetch('/api/creative-activities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          studentName: selectedStudent,
          semester,
          selectedActivityIds,
          teacherNotes,
          apiKey
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await response.json()
      setGeneratedContent(data.data.content)
    } catch (error) {
      console.error('Error generating content:', error)
      alert(`생성 중 오류가 발생했습니다: ${error}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const currentClass = classes.find(c => c.id === selectedClassId)
  const students = currentClass?.students || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/creative-activities')}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              창의적 체험활동 관리로 돌아가기
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              창의적 체험활동 누가기록 생성
            </h1>
            <p className="text-gray-600 mt-2">
              학생별로 창의적 체험활동 누가기록을 AI로 생성합니다
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 왼쪽: 설정 영역 */}
            <div className="space-y-6">
              {/* 학급 및 학생 선택 */}
              <Card>
                <CardHeader>
                  <CardTitle>학급 및 학생 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="class">학급</Label>
                    <Select value={selectedClassId} onValueChange={(value) => {
                      setSelectedClassId(value)
                      const newClass = classes.find(c => c.id === value)
                      if (newClass?.students?.[0]) {
                        const firstStudent = newClass.students[0]
                        setSelectedStudent(typeof firstStudent === 'string' ? firstStudent : firstStudent.name)
                      }
                      setSelectedActivityIds([])
                    }}>
                      <SelectTrigger id="class">
                        <SelectValue placeholder="학급을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id}>
                            {classItem.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="student">학생</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger id="student">
                        <SelectValue placeholder="학생을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student, index) => {
                          const studentName = typeof student === 'string' ? student : student.name
                          return (
                            <SelectItem key={studentName || index} value={studentName}>
                              {studentName}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="semester">학기</Label>
                    <Select value={semester} onValueChange={setSemester}>
                      <SelectTrigger id="semester">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-1">2024-1학기</SelectItem>
                        <SelectItem value="2024-2">2024-2학기</SelectItem>
                        <SelectItem value="2025-1">2025-1학기</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 활동 선택 */}
              {selectedClassId && selectedStudent && (
                <ActivitySelector
                  classId={selectedClassId}
                  studentName={selectedStudent}
                  selectedActivityIds={selectedActivityIds}
                  onSelectionChange={setSelectedActivityIds}
                />
              )}

              {/* 교사 관찰 내용 */}
              <Card>
                <CardHeader>
                  <CardTitle>교사 관찰 내용</CardTitle>
                  <CardDescription>
                    학생의 특별한 행동이나 성장 모습을 입력하세요 (선택사항)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="예: 평소 소극적이었으나 이번 활동에서는 적극적으로 의견을 제시함. 친구들을 도와주는 모습이 자주 관찰됨..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* 생성 버튼 */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || selectedActivityIds.length === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    누가기록 생성
                  </>
                )}
              </Button>
            </div>

            {/* 오른쪽: 결과 영역 */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>생성된 누가기록</CardTitle>
                    {generatedContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            복사
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {generatedContent}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>글자 수: {generatedContent.length}자</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p>활동을 선택하고 생성 버튼을 눌러주세요</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}