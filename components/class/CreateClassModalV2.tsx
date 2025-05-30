'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, Trash2, X } from 'lucide-react'

interface Student {
  number: number
  name: string
}

interface CreateClassModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    class_name: string
    grade: string
    semester: string
    teacher?: string
    students: Student[]
    school_code?: string
  }) => void
}

export function CreateClassModalV2({ open, onOpenChange, onSubmit }: CreateClassModalProps) {
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState('')
  const [semester, setSemester] = useState('')
  const [teacher, setTeacher] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!className || !grade || !semester) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    // 학급 코드 형식 검증 (입력한 경우에만)
    if (schoolCode) {
      const codePattern = /^[A-Z0-9]{4,10}$/
      if (!codePattern.test(schoolCode.toUpperCase())) {
        alert('학급 코드는 4-10자의 영문 대문자와 숫자로만 구성되어야 합니다.')
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        class_name: className,
        grade,
        semester,
        teacher: teacher || undefined,
        students,
        school_code: schoolCode ? schoolCode.toUpperCase() : undefined
      })
      
      // 폼 초기화
      setClassName('')
      setGrade('')
      setSemester('')
      setTeacher('')
      setSchoolCode('')
      setStudents([])
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addStudent = () => {
    const newNumber = students.length > 0 
      ? Math.max(...students.map(s => s.number)) + 1 
      : 1
    setStudents([...students, { number: newNumber, name: '' }])
  }

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index))
  }

  const updateStudent = (index: number, field: 'name' | 'number', value: string | number) => {
    const updatedStudents = [...students]
    updatedStudents[index] = { ...updatedStudents[index], [field]: value }
    setStudents(updatedStudents)
  }

  const handleCSVPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const lines = pastedData.trim().split('\n')
    
    const newStudents: Student[] = []
    lines.forEach(line => {
      const parts = line.trim().split(/[\t,]/)
      if (parts.length >= 2) {
        const number = parseInt(parts[0])
        const name = parts[1].trim()
        if (!isNaN(number) && name) {
          newStudents.push({ number, name })
        }
      } else if (parts.length === 1 && parts[0]) {
        // 이름만 있는 경우
        newStudents.push({ 
          number: newStudents.length + 1, 
          name: parts[0].trim() 
        })
      }
    })
    
    if (newStudents.length > 0) {
      setStudents(newStudents)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">새 학급 만들기</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="className">
                학급명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 3학년 2반"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">담당 교사</Label>
              <Input
                id="teacher"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="예: 김선생"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">
                학년 <span className="text-red-500">*</span>
              </Label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
              >
                <option value="">선택하세요</option>
                <option value="1학년">1학년</option>
                <option value="2학년">2학년</option>
                <option value="3학년">3학년</option>
                <option value="4학년">4학년</option>
                <option value="5학년">5학년</option>
                <option value="6학년">6학년</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">
                학기 <span className="text-red-500">*</span>
              </Label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
              >
                <option value="">선택하세요</option>
                <option value="1학기">1학기</option>
                <option value="2학기">2학기</option>
                <option value="여름방학">여름방학</option>
                <option value="겨울방학">겨울방학</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolCode">
              학급 코드 (선택)
            </Label>
            <Input
              id="schoolCode"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
              placeholder="예: CLASS1, ABC123 (학생들이 설문 참여시 사용)"
              maxLength={10}
            />
            <p className="text-sm text-gray-500">
              학급 코드를 설정하면 학생들이 이 코드로 설문에 참여할 수 있습니다.
              설정하지 않으면 나중에 추가할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>학생 명단</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addStudent}
              >
                <Plus className="h-4 w-4 mr-1" />
                학생 추가
              </Button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                엑셀에서 복사하여 붙여넣기 하거나, 개별적으로 추가할 수 있습니다.
              </p>
              <Textarea
                placeholder="번호[탭]이름 형식으로 붙여넣기 (예: 1	홍길동)"
                onPaste={handleCSVPaste}
                className="min-h-[60px]"
              />
            </div>

            {students.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {students.map((student, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={student.number}
                      onChange={(e) => updateStudent(index, 'number', parseInt(e.target.value) || 0)}
                      className="w-20"
                      placeholder="번호"
                    />
                    <Input
                      value={student.name}
                      onChange={(e) => updateStudent(index, 'name', e.target.value)}
                      className="flex-1"
                      placeholder="이름"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStudent(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-md flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">학급 생성 안내</p>
              <p>• 학급 코드는 선택사항이며, 나중에 설정할 수 있습니다.</p>
              <p>• 학생 명단은 나중에 추가하거나 수정할 수 있습니다.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '생성 중...' : '학급 만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}