'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { Save, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'

interface Class {
  id: string
  class_name: string
  students: Array<{ number: number; name: string }>
}

interface EvaluationPlan {
  id: string
  subject: string
  unit: string
  lesson?: string
  evaluation_criteria: {
    excellent: { level: string; description: string }
    good: { level: string; description: string }
    satisfactory: { level: string; description: string }
    needs_improvement: { level: string; description: string }
  }
}

interface StudentResult {
  student_number: number
  student_name: string
  result?: '매우잘함' | '잘함' | '보통' | '노력요함'
  result_criteria?: string
  teacher_notes?: string
}

export default function EvaluationResultsPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [evaluationPlans, setEvaluationPlans] = useState<EvaluationPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  // 학급 목록 불러오기
  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  // 선택된 학급의 학생 목록 설정
  useEffect(() => {
    if (selectedClass) {
      const classData = classes.find(c => c.id === selectedClass)
      if (classData && classData.students) {
        setStudentResults(
          classData.students.map(student => ({
            student_number: student.number,
            student_name: student.name,
            result: undefined,
            result_criteria: undefined,
            teacher_notes: ''
          }))
        )
      }
      fetchEvaluationPlans()
    }
  }, [selectedClass, classes])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      const data = await response.json()
      if (data.success) {
        setClasses(data.data)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchEvaluationPlans = async () => {
    try {
      const response = await fetch('/api/evaluations')
      const data = await response.json()
      if (data.success) {
        setEvaluationPlans(data.data)
      }
    } catch (error) {
      console.error('Error fetching evaluation plans:', error)
    }
  }

  const handleResultChange = (studentNumber: number, result: string) => {
    const plan = evaluationPlans.find(p => p.id === selectedPlan)
    if (!plan) return

    const criteriaMap = {
      '매우잘함': plan.evaluation_criteria.excellent,
      '잘함': plan.evaluation_criteria.good,
      '보통': plan.evaluation_criteria.satisfactory,
      '노력요함': plan.evaluation_criteria.needs_improvement
    }

    const criteria = criteriaMap[result as keyof typeof criteriaMap]

    setStudentResults(prev => 
      prev.map(s => 
        s.student_number === studentNumber 
          ? { 
              ...s, 
              result: result as any,
              result_criteria: criteria?.description || ''
            }
          : s
      )
    )
  }

  const handleNotesChange = (studentNumber: number, notes: string) => {
    setStudentResults(prev => 
      prev.map(s => 
        s.student_number === studentNumber 
          ? { ...s, teacher_notes: notes }
          : s
      )
    )
  }

  const handleSave = async () => {
    if (!selectedClass || !selectedPlan) {
      alert('학급과 평가계획을 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/evaluation-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
          evaluation_plan_id: selectedPlan,
          results: studentResults
        })
      })

      if (response.ok) {
        alert('평가 결과가 저장되었습니다.')
      } else {
        alert('저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving results:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const currentStudent = studentResults[currentStudentIndex]
  const selectedPlanData = evaluationPlans.find(p => p.id === selectedPlan)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">학생 평가 결과 입력</h1>
        <p className="mt-2 text-sm text-gray-600">
          평가계획에 따라 학생별 성취 수준을 기록합니다.
        </p>
      </div>

      {/* 선택 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="class">학급 선택</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="학급을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="evaluation">평가계획 선택</Label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue placeholder="평가계획을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {evaluationPlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.subject} - {plan.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 평가 입력 영역 */}
      {selectedClass && selectedPlan && currentStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {currentStudent.student_number}번 {currentStudent.student_name}
                </CardTitle>
                <CardDescription>
                  {selectedPlanData?.subject} - {selectedPlanData?.unit}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStudentIndex(Math.max(0, currentStudentIndex - 1))}
                  disabled={currentStudentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <span className="text-sm text-gray-500">
                  {currentStudentIndex + 1} / {studentResults.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStudentIndex(Math.min(studentResults.length - 1, currentStudentIndex + 1))}
                  disabled={currentStudentIndex === studentResults.length - 1}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 평가 결과 선택 */}
            <div className="space-y-3">
              <Label>평가 결과</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['매우잘함', '잘함', '보통', '노력요함'].map((level) => (
                  <Button
                    key={level}
                    variant={currentStudent.result === level ? 'default' : 'outline'}
                    onClick={() => handleResultChange(currentStudent.student_number, level)}
                    className="w-full"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* 선택된 평가 기준 표시 */}
            {currentStudent.result && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium">평가 기준</Label>
                <p className="mt-1 text-sm text-gray-700">
                  {currentStudent.result_criteria}
                </p>
              </div>
            )}

            {/* 교사 관찰 사항 */}
            <div>
              <Label htmlFor="notes">추가 관찰 사항</Label>
              <Textarea
                id="notes"
                placeholder="특별한 관찰 사항이나 기록할 내용을 입력하세요..."
                value={currentStudent.teacher_notes || ''}
                onChange={(e) => handleNotesChange(currentStudent.student_number, e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 학생 현황 */}
      {selectedClass && selectedPlan && studentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              전체 학생 평가 현황
            </CardTitle>
            <CardDescription>
              평가 완료: {studentResults.filter(s => s.result).length} / {studentResults.length}명
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">평가결과</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">메모</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentResults.map((student, index) => (
                    <tr
                      key={student.student_number}
                      className={`cursor-pointer hover:bg-gray-50 ${currentStudentIndex === index ? 'bg-blue-50' : ''}`}
                      onClick={() => setCurrentStudentIndex(index)}
                    >
                      <td className="px-3 py-2 text-sm">{student.student_number}</td>
                      <td className="px-3 py-2 text-sm">{student.student_name}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          student.result === '매우잘함' ? 'bg-blue-100 text-blue-800' :
                          student.result === '잘함' ? 'bg-green-100 text-green-800' :
                          student.result === '보통' ? 'bg-yellow-100 text-yellow-800' :
                          student.result === '노력요함' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {student.result || '미입력'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {student.teacher_notes ? '✓' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 저장 버튼 */}
      {selectedClass && selectedPlan && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? '저장 중...' : '평가 결과 저장'}
          </Button>
        </div>
      )}
    </div>
  )
}