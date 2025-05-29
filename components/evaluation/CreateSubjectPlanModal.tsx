'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateSubjectPlanDTO, SUBJECTS, GRADES, SEMESTERS } from '@/lib/types/evaluation-v2'
import { X, BookOpen } from 'lucide-react'

interface CreateSubjectPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (planData: CreateSubjectPlanDTO) => Promise<void>
}

export function CreateSubjectPlanModal({ open, onOpenChange, onSubmit }: CreateSubjectPlanModalProps) {
  const currentYear = new Date().getFullYear()
  const [formData, setFormData] = useState<CreateSubjectPlanDTO>({
    subject: '',
    grade: '',
    semester: '',
    school_year: currentYear
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit(formData)
      
      // Reset form
      setFormData({
        subject: '',
        grade: '',
        semester: '',
        school_year: currentYear
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create subject plan:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle>새 과목 평가계획</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            과목별 평가계획을 생성하면 해당 과목의 개별 평가들을 추가할 수 있습니다.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school_year">학년도</Label>
              <select
                id="school_year"
                value={formData.school_year}
                onChange={(e) => setFormData({ ...formData, school_year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md bg-white"
                required
              >
                <option value={currentYear}>{currentYear}학년도</option>
                <option value={currentYear - 1}>{currentYear - 1}학년도</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="grade">학년 *</Label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  required
                >
                  <option value="">선택</option>
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">학기 *</Label>
                <select
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  required
                >
                  <option value="">선택</option>
                  {SEMESTERS.map(semester => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">과목 *</Label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  required
                >
                  <option value="">선택</option>
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 과목별 평가계획을 생성한 후, 단원별 개별 평가를 추가할 수 있습니다.
              </p>
            </div>
          </CardContent>

          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '평가계획 생성'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}