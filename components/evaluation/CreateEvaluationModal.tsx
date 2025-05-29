'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EvaluationPlan } from '@/types'
import { X } from 'lucide-react'

interface CreateEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (evaluationData: Omit<EvaluationPlan, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function CreateEvaluationModal({ open, onOpenChange, onSubmit }: CreateEvaluationModalProps) {
  const [formData, setFormData] = useState({
    subject: '',
    grade: '',
    semester: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        ...formData,
        evaluations: []
      })
      
      // Reset form
      setFormData({
        subject: '',
        grade: '',
        semester: '',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">새 평가계획 만들기</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">과목 *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="예: 수학"
              required
            />
          </div>

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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}