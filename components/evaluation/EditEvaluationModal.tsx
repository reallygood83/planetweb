'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Save, Loader2 } from 'lucide-react'
import { EvaluationPlan } from '@/lib/types/evaluation'

interface EditEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: EvaluationPlan | null
  onSave: (evaluationData: Partial<EvaluationPlan>) => Promise<void>
}

export function EditEvaluationModal({ open, onOpenChange, evaluation, onSave }: EditEvaluationModalProps) {
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [semester, setSemester] = useState('')
  const [unit, setUnit] = useState('')
  const [period, setPeriod] = useState('')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [achievementStandards, setAchievementStandards] = useState('')
  const [evaluationCriteria, setEvaluationCriteria] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (evaluation && open) {
      setSubject(evaluation.subject || '')
      setGrade(evaluation.grade || '')
      setSemester(evaluation.semester || '')
      setUnit(evaluation.unit || '')
      setPeriod(evaluation.period || '')
      setLearningObjectives(evaluation.learning_objectives || '')
      setAchievementStandards(evaluation.achievement_standards || '')
      setEvaluationCriteria(evaluation.evaluation_criteria || '')
    }
  }, [evaluation, open])

  const handleSave = async () => {
    if (!unit.trim()) {
      alert('단원명은 필수 항목입니다.')
      return
    }

    setIsSaving(true)
    
    try {
      await onSave({
        id: evaluation?.id,
        subject: subject.trim(),
        grade: grade.trim(),
        semester: semester.trim(),
        unit: unit.trim(),
        period: period.trim() || null, // 선택사항
        learning_objectives: learningObjectives.trim(),
        achievement_standards: achievementStandards.trim(),
        evaluation_criteria: evaluationCriteria.trim()
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving evaluation:', error)
      alert('평가계획 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>평가계획 편집</CardTitle>
              <CardDescription>
                평가계획 정보를 수정하세요. 단원명은 필수이며, 차시는 선택사항입니다.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subject">교과목</Label>
                <input
                  id="edit-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 국어"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="edit-grade">학년</Label>
                <select
                  id="edit-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-semester">학기</Label>
                <select
                  id="edit-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">선택하세요</option>
                  <option value="1학기">1학기</option>
                  <option value="2학기">2학기</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-unit">
                  단원명 <Badge variant="destructive" className="text-xs ml-1">필수</Badge>
                </Label>
                <input
                  id="edit-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="예: 1. 비유하는 표현"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-period">
                차시 <Badge variant="secondary" className="text-xs ml-1">선택</Badge>
              </Label>
              <input
                id="edit-period"
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="예: 1/8차시 (선택사항)"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <Label htmlFor="edit-objectives">학습목표</Label>
              <Textarea
                id="edit-objectives"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="이 단원에서 학생들이 달성해야 할 학습목표를 입력하세요"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-standards">성취기준</Label>
              <Textarea
                id="edit-standards"
                value={achievementStandards}
                onChange={(e) => setAchievementStandards(e.target.value)}
                placeholder="교육과정의 성취기준을 입력하세요"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-criteria">평가기준</Label>
              <Textarea
                id="edit-criteria"
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                placeholder="학생들을 평가할 기준을 입력하세요"
                rows={4}
              />
            </div>
          </CardContent>

          <div className="p-6 pt-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={isSaving || !unit.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}