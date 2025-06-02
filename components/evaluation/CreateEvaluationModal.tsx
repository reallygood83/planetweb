'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EvaluationPlan, AIGenerationTarget, SUBJECTS, GRADES, SEMESTERS, SCHOOL_YEARS, EVALUATION_METHODS, EVALUATION_TOOLS } from '@/lib/types/evaluation'
import { X, Plus, Trash2 } from 'lucide-react'

interface CreateEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (evaluationData: Omit<EvaluationPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void
}

export function CreateEvaluationModal({ open, onOpenChange, onSubmit }: CreateEvaluationModalProps) {
  const [formData, setFormData] = useState({
    // 기본 정보
    subject: '',
    grade: '',
    semester: '',
    school_year: new Date().getFullYear().toString(), // 기본값: 현재 년도
    unit: '',
    lesson: '',
    
    // 교육과정 정보
    achievement_standards: [{ code: '', content: '' }],
    learning_objectives: [''],
    
    // 평가 설계 - 기본값 설정
    evaluation_methods: ['관찰평가'] as string[],
    evaluation_tools: ['체크리스트'] as string[],
    evaluation_criteria: {
      excellent: { level: '매우잘함' as const, description: '' },
      good: { level: '잘함' as const, description: '' },
      satisfactory: { level: '보통' as const, description: '' },
      needs_improvement: { level: '노력요함' as const, description: '' }
    },
    
    // AI 생성 대상
    ai_generation_targets: ['교과학습발달상황', '창의적 체험활동 누가기록', '행동특성 및 종합의견'] as AIGenerationTarget[],
    
    // 생기부 연계
    record_keywords: [''],
    special_notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: 기본정보, 1: 교육과정, 2: 평가기준

  const addAchievementStandard = () => {
    setFormData(prev => ({
      ...prev,
      achievement_standards: [...prev.achievement_standards, { code: '', content: '' }]
    }))
  }

  const removeAchievementStandard = (index: number) => {
    setFormData(prev => ({
      ...prev,
      achievement_standards: prev.achievement_standards.filter((_, i) => i !== index)
    }))
  }

  const addLearningObjective = () => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: [...prev.learning_objectives, '']
    }))
  }

  const removeLearningObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter((_, i) => i !== index)
    }))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      onSubmit({
        ...formData,
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
        record_keywords: formData.record_keywords.filter(keyword => keyword.trim())
      })
      
      // Reset form
      setFormData({
        subject: '',
        grade: '',
        semester: '',
        school_year: new Date().getFullYear().toString(),
        unit: '',
        lesson: '',
        achievement_standards: [{ code: '', content: '' }],
        learning_objectives: [''],
        evaluation_methods: [],
        evaluation_tools: [],
        evaluation_criteria: {
          excellent: { level: '매우잘함', description: '' },
          good: { level: '잘함', description: '' },
          satisfactory: { level: '보통', description: '' },
          needs_improvement: { level: '노력요함', description: '' }
        },
        ai_generation_targets: ['교과학습발달상황', '창의적 체험활동 누가기록', '행동특성 및 종합의견'] as AIGenerationTarget[],
        record_keywords: [''],
        special_notes: ''
      })
      setCurrentStep(0)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.subject && formData.grade && formData.semester && formData.unit
      case 1:
        // 성취기준과 학습목표는 선택사항 - 내용만 있으면 코드는 없어도 됨
        return formData.achievement_standards.some(std => std.content.trim())
      case 2:
        return Object.values(formData.evaluation_criteria).every(criteria => criteria.description.trim())
      default:
        return false
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">새 평가계획 만들기</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['기본정보', '교육과정', '평가기준'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                {step}
              </span>
              {index < 2 && <div className="w-8 h-px bg-gray-300 mx-4" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 0: 기본정보 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">과목 *</Label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">선택하세요</option>
                    {SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">학년 *</Label>
                  <select
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">선택하세요</option>
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
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">선택하세요</option>
                    {SEMESTERS.map(semester => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_year">학년도 *</Label>
                  <select
                    id="school_year"
                    value={formData.school_year}
                    onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {SCHOOL_YEARS.map(year => (
                      <option key={year} value={year}>{year}년</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">단원명 *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="예: 분수의 덧셈과 뺄셈"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson">차시 (선택)</Label>
                  <Input
                    id="lesson"
                    value={formData.lesson}
                    onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                    placeholder="예: 3/10차시, 1차시, 5차시"
                  />
                  <p className="text-xs text-gray-500">
                    💡 한 단원에서 여러 평가를 진행할 경우 차시를 구분해주세요.
                    <br />같은 단원이라도 차시가 다르면 별도 평가계획으로 생성됩니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 평가방법 */}
                <div className="space-y-2">
                  <Label>평가방법 (선택)</Label>
                  <select
                    value={formData.evaluation_methods[0] || ''}
                    onChange={(e) => setFormData({ ...formData, evaluation_methods: e.target.value ? [e.target.value] : [] })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {EVALUATION_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {/* 평가도구 */}
                <div className="space-y-2">
                  <Label>평가도구 (선택)</Label>
                  <select
                    value={formData.evaluation_tools[0] || ''}
                    onChange={(e) => setFormData({ ...formData, evaluation_tools: e.target.value ? [e.target.value] : [] })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {EVALUATION_TOOLS.map(tool => (
                      <option key={tool} value={tool}>{tool}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: 교육과정 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">교육과정 정보</h3>
              
              {/* 성취기준 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>성취기준 *</Label>
                    <p className="text-xs text-gray-500 mt-1">성취기준 번호는 선택사항입니다</p>
                  </div>
                  <Button type="button" onClick={addAchievementStandard} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
                
                {formData.achievement_standards.map((standard, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="[6수03-01] (선택)"
                      value={standard.code}
                      onChange={(e) => {
                        const newStandards = [...formData.achievement_standards]
                        newStandards[index].code = e.target.value
                        setFormData({ ...formData, achievement_standards: newStandards })
                      }}
                      className="w-40"
                    />
                    <Input
                      placeholder="성취기준 내용 *"
                      value={standard.content}
                      onChange={(e) => {
                        const newStandards = [...formData.achievement_standards]
                        newStandards[index].content = e.target.value
                        setFormData({ ...formData, achievement_standards: newStandards })
                      }}
                      className="flex-1"
                      required
                    />
                    {formData.achievement_standards.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeAchievementStandard(index)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* 학습목표 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>학습목표 (선택)</Label>
                    <p className="text-xs text-gray-500 mt-1">필요한 경우에만 입력하세요</p>
                  </div>
                  <Button type="button" onClick={addLearningObjective} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
                
                {formData.learning_objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="학습목표를 입력하세요"
                      value={objective}
                      onChange={(e) => {
                        const newObjectives = [...formData.learning_objectives]
                        newObjectives[index] = e.target.value
                        setFormData({ ...formData, learning_objectives: newObjectives })
                      }}
                      className="flex-1"
                    />
                    {formData.learning_objectives.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeLearningObjective(index)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 평가기준 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">평가기준 설정</h3>
              
              <div className="grid gap-4">
                {Object.entries(formData.evaluation_criteria).map(([key, criteria]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-lg font-medium">{criteria.level}</Label>
                    <Textarea
                      value={criteria.description}
                      onChange={(e) => setFormData({
                        ...formData,
                        evaluation_criteria: {
                          ...formData.evaluation_criteria,
                          [key]: { ...criteria, description: e.target.value }
                        }
                      })}
                      placeholder={`${criteria.level} 수준의 평가기준을 구체적으로 작성하세요`}
                      rows={3}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onOpenChange(false)}
            >
              {currentStep === 0 ? '취소' : '이전'}
            </Button>

            {currentStep < 2 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                다음
              </Button>
            ) : (
              <Button type="submit" disabled={loading || !canProceed()}>
                {loading ? '생성 중...' : '평가계획 생성'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}