'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Class, Student } from '@/types'
import { X, Plus, Trash2, Upload } from 'lucide-react'

interface EditClassModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (classData: Omit<Class, 'user_id' | 'created_at' | 'updated_at'>) => void
  classData: Class
}

export function EditClassModal({ open, onOpenChange, onSubmit, classData }: EditClassModalProps) {
  const [formData, setFormData] = useState({
    class_name: '',
    grade: '',
    semester: '',
    teacher: '',
  })
  const [students, setStudents] = useState<Student[]>([])
  const [newStudent, setNewStudent] = useState({ number: 1, name: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (classData) {
      setFormData({
        class_name: classData.class_name,
        grade: classData.grade,
        semester: classData.semester,
        teacher: classData.teacher || '',
      })
      setStudents([...classData.students])
      setNewStudent({ 
        number: Math.max(...classData.students.map(s => s.number), 0) + 1, 
        name: '' 
      })
    }
  }, [classData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        id: classData.id,
        ...formData,
        students: students.sort((a, b) => a.number - b.number)
      })
    } catch (error) {
      console.error('Error updating class:', error)
    } finally {
      setLoading(false)
    }
  }

  const addStudent = () => {
    if (newStudent.name.trim()) {
      // 번호 중복 확인
      const existingStudent = students.find(s => s.number === newStudent.number)
      if (existingStudent) {
        alert('이미 사용 중인 번호입니다.')
        return
      }

      setStudents([...students, { ...newStudent }])
      setNewStudent({ 
        number: Math.max(...students.map(s => s.number), 0) + 1, 
        name: '' 
      })
    }
  }

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index))
  }

  const handleStudentNumberChange = (value: string) => {
    const number = parseInt(value) || 1
    setNewStudent({ ...newStudent, number })
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csv = event.target?.result as string
      const lines = csv.split('\n').filter(line => line.trim())
      
      // Skip header if exists
      const dataLines = lines.slice(1)
      const csvStudents: Student[] = []

      dataLines.forEach((line, index) => {
        const [numberStr, name] = line.split(',').map(item => item.trim().replace(/"/g, ''))
        if (name) {
          const number = parseInt(numberStr) || (index + 1)
          csvStudents.push({ number, name })
        }
      })

      if (csvStudents.length > 0) {
        setStudents(csvStudents)
        setNewStudent({ 
          number: Math.max(...csvStudents.map(s => s.number), 0) + 1, 
          name: '' 
        })
      }
    }
    reader.readAsText(file)
    
    // Reset input
    e.target.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">학급 편집</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">기본 정보</h3>
            
            <div className="space-y-2">
              <Label htmlFor="class_name">학급명 *</Label>
              <Input
                id="class_name"
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                placeholder="예: 5학년 3반"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">학년 *</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="예: 5학년"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">학기 *</Label>
                <Input
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="예: 1학기"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">담임교사</Label>
              <Input
                id="teacher"
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                placeholder="예: 김선생님"
              />
            </div>

            {classData.school_code && (
              <div className="space-y-2">
                <Label>학급 코드</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={classData.school_code}
                    readOnly
                    className="bg-gray-50 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(classData.school_code || '')
                      alert('학급 코드가 복사되었습니다.')
                    }}
                  >
                    복사
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  학생들이 설문에 참여할 때 사용하는 코드입니다.
                </p>
              </div>
            )}
          </div>

          {/* 학생 관리 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">학생 명단</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  CSV 업로드
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="w-20">
                <Input
                  type="number"
                  placeholder="번호"
                  value={newStudent.number}
                  onChange={(e) => handleStudentNumberChange(e.target.value)}
                  min="1"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="학생 이름"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStudent())}
                />
              </div>
              <Button type="button" onClick={addStudent} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {students.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                <div className="space-y-1">
                  {students.map((student, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm">
                        {student.number}번 {student.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              CSV 형식: 번호,이름 (예: 1,김철수)
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}