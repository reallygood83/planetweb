'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EvaluationPlan, AIGenerationTarget, SUBJECTS, GRADES, SEMESTERS, EVALUATION_METHODS, EVALUATION_TOOLS } from '@/lib/types/evaluation'
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
    unit: '',
    lesson: '',
    
    // 교육과정 정보
    achievement_standards: [{ code: '', content: '' }],
    learning_objectives: [''],
    
    // 평가 설계
    evaluation_methods: [] as string[],
    evaluation_tools: [] as string[],
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
  const [currentStep, setCurrentStep] = useState(0) // 0: 기본정보, 1: 교육과정, 2: 평가설계, 3: 평가기준

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

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      record_keywords: [...prev.record_keywords, '']
    }))
  }

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      record_keywords: prev.record_keywords.filter((_, i) => i !== index)
    }))
  }

  const toggleMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      evaluation_methods: prev.evaluation_methods.includes(method)
        ? prev.evaluation_methods.filter(m => m !== method)
        : [...prev.evaluation_methods, method]
    }))
  }

  const toggleTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      evaluation_tools: prev.evaluation_tools.includes(tool)
        ? prev.evaluation_tools.filter(t => t !== tool)
        : [...prev.evaluation_tools, tool]
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
        return formData.achievement_standards.some(std => std.code && std.content) &&
               formData.learning_objectives.some(obj => obj.trim())
      case 2:
        return formData.evaluation_methods.length > 0 && formData.evaluation_tools.length > 0
      case 3:
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
          {['기본정보', '교육과정', '평가설계', '평가기준'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                {step}
              </span>
              {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
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
                    placeholder="예: 3/10차시"
                  />
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
                  <Label>성취기준 *</Label>
                  <Button type="button" onClick={addAchievementStandard} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
                
                {formData.achievement_standards.map((standard, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="[6수03-01]"
                      value={standard.code}
                      onChange={(e) => {
                        const newStandards = [...formData.achievement_standards]
                        newStandards[index].code = e.target.value
                        setFormData({ ...formData, achievement_standards: newStandards })
                      }}
                      className="w-32"
                    />
                    <Input
                      placeholder="성취기준 내용"
                      value={standard.content}
                      onChange={(e) => {
                        const newStandards = [...formData.achievement_standards]
                        newStandards[index].content = e.target.value
                        setFormData({ ...formData, achievement_standards: newStandards })
                      }}
                      className="flex-1"
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
                  <Label>학습목표 *</Label>
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

          {/* Step 2: 평가설계 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">평가 설계</h3>
              
              {/* 평가방법 */}
              <div className="space-y-3">
                <Label>평가방법 * (복수 선택 가능)</Label>
                <div className="flex flex-wrap gap-2">
                  {EVALUATION_METHODS.map(method => (
                    <Badge
                      key={method}
                      variant={formData.evaluation_methods.includes(method) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleMethod(method)}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 평가도구 */}
              <div className="space-y-3">
                <Label>평가도구 * (복수 선택 가능)</Label>
                <div className="flex flex-wrap gap-2">
                  {EVALUATION_TOOLS.map(tool => (
                    <Badge
                      key={tool}
                      variant={formData.evaluation_tools.includes(tool) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTool(tool)}
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 생기부 키워드 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>생기부 연계 키워드</Label>
                  <Button type="button" onClick={addKeyword} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
                
                {formData.record_keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="핵심 키워드"
                      value={keyword}
                      onChange={(e) => {
                        const newKeywords = [...formData.record_keywords]
                        newKeywords[index] = e.target.value
                        setFormData({ ...formData, record_keywords: newKeywords })
                      }}
                      className="flex-1"
                    />
                    {formData.record_keywords.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_notes">특별 고려사항</Label>
                <Textarea
                  id="special_notes"
                  value={formData.special_notes}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  placeholder="평가 시 특별히 고려할 사항이 있으면 입력하세요"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: 평가기준 */}
          {currentStep === 3 && (
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

            {currentStep < 3 ? (
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