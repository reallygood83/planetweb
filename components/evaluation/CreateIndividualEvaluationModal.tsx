'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CreateEvaluationDTO, 
  AchievementStandard,
  EVALUATION_METHODS, 
  EVALUATION_TOOLS,
  EVALUATION_PERIODS 
} from '@/lib/types/evaluation-v2'
import { X, Plus, Trash2, FileText } from 'lucide-react'

interface CreateIndividualEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (evaluationData: Omit<CreateEvaluationDTO, 'plan_id'>) => Promise<void>
  subjectInfo: {
    subject: string
    grade: string
    semester: string
  }
}

export function CreateIndividualEvaluationModal({ 
  open, 
  onOpenChange, 
  onSubmit,
  subjectInfo 
}: CreateIndividualEvaluationModalProps) {
  const [formData, setFormData] = useState({
    evaluation_name: '',
    unit: '',
    lesson: '',
    evaluation_period: '',
    achievement_standards: [{ code: '', content: '' }] as AchievementStandard[],
    evaluation_methods: [] as string[],
    evaluation_tools: [] as string[],
    evaluation_criteria: {
      excellent: { level: '매우잘함' as const, description: '' },
      good: { level: '잘함' as const, description: '' },
      satisfactory: { level: '보통' as const, description: '' },
      needs_improvement: { level: '노력요함' as const, description: '' }
    },
    weight: 100
  })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: 기본정보, 1: 성취기준, 2: 평가방법, 3: 평가기준

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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.evaluation_name && formData.unit
      case 1:
        return formData.achievement_standards.some(std => std.code && std.content)
      case 2:
        return formData.evaluation_methods.length > 0 && formData.evaluation_tools.length > 0
      case 3:
        return Object.values(formData.evaluation_criteria).every(criteria => criteria.description.trim())
      default:
        return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        ...formData,
        achievement_standards: formData.achievement_standards.filter(std => std.code && std.content)
      })
      
      // Reset form
      setFormData({
        evaluation_name: '',
        unit: '',
        lesson: '',
        evaluation_period: '',
        achievement_standards: [{ code: '', content: '' }],
        evaluation_methods: [],
        evaluation_tools: [],
        evaluation_criteria: {
          excellent: { level: '매우잘함', description: '' },
          good: { level: '잘함', description: '' },
          satisfactory: { level: '보통', description: '' },
          needs_improvement: { level: '노력요함', description: '' }
        },
        weight: 100
      })
      setCurrentStep(0)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create evaluation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <CardTitle>새 평가 추가</CardTitle>
              </div>
              <CardDescription className="mt-1">
                {subjectInfo.subject} • {subjectInfo.grade} • {subjectInfo.semester}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Progress Steps */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center">
            {['기본정보', '성취기준', '평가방법', '평가기준'].map((step, index) => (
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
        </div>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Step 0: 기본정보 */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="evaluation_name">평가명 *</Label>
                  <Input
                    id="evaluation_name"
                    value={formData.evaluation_name}
                    onChange={(e) => setFormData({ ...formData, evaluation_name: e.target.value })}
                    placeholder="예: 분수의 덧셈과 뺄셈"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">단원 *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="예: 2. 분수의 덧셈과 뺄셈"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lesson">차시</Label>
                    <Input
                      id="lesson"
                      value={formData.lesson}
                      onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                      placeholder="예: 3-4/10차시"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="evaluation_period">평가시기</Label>
                    <select
                      id="evaluation_period"
                      value={formData.evaluation_period}
                      onChange={(e) => setFormData({ ...formData, evaluation_period: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">선택하세요</option>
                      {EVALUATION_PERIODS.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">평가 비중 (%)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: 성취기준 */}
            {currentStep === 1 && (
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
                    <Textarea
                      placeholder="성취기준 내용을 입력하세요"
                      value={standard.content}
                      onChange={(e) => {
                        const newStandards = [...formData.achievement_standards]
                        newStandards[index].content = e.target.value
                        setFormData({ ...formData, achievement_standards: newStandards })
                      }}
                      className="flex-1"
                      rows={2}
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
            )}

            {/* Step 2: 평가방법 */}
            {currentStep === 2 && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Step 3: 평가기준 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm text-amber-800">
                    💡 평가기준은 학생들의 교과학습발달상황 생성 시 중요한 참고자료가 됩니다.
                    각 수준별로 구체적이고 명확한 기준을 작성해주세요.
                  </p>
                </div>

                <div className="grid gap-4">
                  {Object.entries(formData.evaluation_criteria).map(([key, criteria]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-lg font-medium flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          key === 'excellent' ? 'bg-green-500' :
                          key === 'good' ? 'bg-blue-500' :
                          key === 'satisfactory' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        {criteria.level}
                      </Label>
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
          </CardContent>

          {/* Navigation */}
          <div className="flex justify-between px-6 pb-6">
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
                {loading ? '추가 중...' : '평가 추가'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}