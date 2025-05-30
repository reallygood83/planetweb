'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { X, Sparkles, Loader2, BookOpen } from 'lucide-react'

interface GeneratedSurvey {
  title: string
  questions: {
    multipleChoice: Array<{
      question: string
      options: string[]
      guideline?: string
    }>
    shortAnswer: Array<{
      question: string
      guideline?: string
    }>
  }
}

interface GenerateSurveyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluationPlan?: EvaluationPlan | null  // 선택사항으로 변경
  onSuccess: (survey: any) => void
}

export function GenerateSurveyModal({ 
  open, 
  onOpenChange, 
  evaluationPlan: initialPlan, 
  onSuccess 
}: GenerateSurveyModalProps) {
  const [customTitle, setCustomTitle] = useState('')
  const [generatedSurvey, setGeneratedSurvey] = useState<GeneratedSurvey | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'generate' | 'preview'>('select')
  
  // 평가 계획 선택 관련 상태
  const [availablePlans, setAvailablePlans] = useState<EvaluationPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<EvaluationPlan | null>(initialPlan || null)
  const [plansLoading, setPlansLoading] = useState(false)

  // 평가 계획 목록 불러오기
  useEffect(() => {
    if (open && !initialPlan) {
      fetchEvaluationPlans()
    } else if (initialPlan) {
      setSelectedPlan(initialPlan)
      setStep('generate')
    }
  }, [open, initialPlan])

  const fetchEvaluationPlans = async () => {
    setPlansLoading(true)
    try {
      const response = await fetch('/api/evaluations')
      const data = await response.json()
      
      if (data.success) {
        setAvailablePlans(Array.isArray(data.data) ? data.data : [])
      } else {
        setError('평가 계획을 불러올 수 없습니다.')
        setAvailablePlans([])
      }
    } catch {
      setError('평가 계획을 불러오는 중 오류가 발생했습니다.')
      setAvailablePlans([])
    } finally {
      setPlansLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedPlan) return

    const encryptedKey = localStorage.getItem('gemini_api_key')
    if (!encryptedKey) {
      setError('먼저 API 키를 설정해주세요.')
      return
    }

    // 암호화된 키를 복호화
    let apiKey = ''
    try {
      const { decryptApiKey } = await import('@/lib/utils')
      const encryptKey = process.env.NEXT_PUBLIC_ENCRYPT_KEY || 'default-key'
      apiKey = decryptApiKey(encryptedKey.replace(/"/g, ''), encryptKey)
    } catch (decryptError) {
      console.error('Failed to decrypt API key:', decryptError)
      setError('API 키 복호화에 실패했습니다. 다시 설정해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/surveys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationPlan: selectedPlan,
          apiKey: apiKey
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedSurvey(data.data)
        setCustomTitle(data.data.title)
        setStep('preview')
      } else {
        setError(data.error || 'AI 설문 생성에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!generatedSurvey || !selectedPlan) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: customTitle || generatedSurvey.title,
          evaluation_plan_id: selectedPlan.id,
          questions: generatedSurvey.questions,
          is_active: true
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess(data.data)
        handleClose()
      } else {
        setError(data.error || '설문 저장에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(initialPlan ? 'generate' : 'select')
    setGeneratedSurvey(null)
    setCustomTitle('')
    setError(null)
    setSelectedPlan(initialPlan || null)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold">AI 자기평가 설문 생성</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 평가계획 정보 (선택되었을 때만) */}
        {selectedPlan && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900">선택된 평가계획</h3>
            <p className="text-blue-800">
              {selectedPlan.subject} • {selectedPlan.grade} • {selectedPlan.semester}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {selectedPlan.unit} {selectedPlan.lesson && `• ${selectedPlan.lesson}`}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">평가계획을 선택하세요</h3>
              <p className="text-gray-600 mb-6">
                설문을 생성할 평가계획을 선택해주세요.
                <br />
                선택한 평가계획의 성취기준과 평가방법을 바탕으로 AI가 자기평가 설문을 생성합니다.
              </p>
            </div>

            {plansLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">평가계획을 불러오는 중...</p>
              </div>
            ) : availablePlans.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  생성된 평가계획이 없습니다
                </h3>
                <p className="text-gray-500 mb-4">
                  먼저 평가계획을 생성해주세요
                </p>
                <Button onClick={handleClose} variant="outline">
                  평가계획 만들러 가기
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {plan.subject} • {plan.grade} • {plan.semester}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {plan.unit} {plan.lesson && `• ${plan.lesson}`}
                        </p>
                        {plan.learning_objectives && Array.isArray(plan.learning_objectives) && plan.learning_objectives.length > 0 && plan.learning_objectives[0] && (
                          <p className="text-xs text-gray-500 mt-2">
                            {(plan.learning_objectives[0] || '').substring(0, 100)}
                            {(plan.learning_objectives[0] || '').length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      {selectedPlan?.id === plan.id && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center ml-2">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPlan && availablePlans.length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button onClick={() => setStep('generate')}>
                  선택 완료
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'generate' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Sparkles className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">학생 자기평가 설문을 생성합니다</h3>
              <p className="text-gray-600 mb-6">
                평가계획을 바탕으로 AI가 초등학생에게 적합한 자기평가 설문을 만들어드립니다.
                <br />
                객관식 3문항과 주관식 2문항으로 구성됩니다.
              </p>
              <Button 
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 설문 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI 설문 생성하기
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && generatedSurvey && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">설문 제목</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="설문 제목을 입력하세요"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">생성된 설문 미리보기</h3>
              
              {/* 객관식 문항 */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-700">객관식 문항</h4>
                {(generatedSurvey.questions?.multipleChoice || []).map((q, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">{index + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(q.options || []).map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <span className="w-6 h-6 border rounded-full flex items-center justify-center text-xs">
                            {optIndex + 1}
                          </span>
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                    {q.guideline && (
                      <p className="text-xs text-gray-600 mt-2">💡 {q.guideline}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* 주관식 문항 */}
              <div className="space-y-4">
                <h4 className="font-medium text-green-700">주관식 문항</h4>
                {(generatedSurvey.questions?.shortAnswer || []).map((q, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">
                      {(generatedSurvey.questions?.multipleChoice?.length || 0) + index + 1}. {q.question}
                    </p>
                    <div className="border border-gray-300 rounded p-2 min-h-[60px] bg-white">
                      <span className="text-gray-400 text-sm">학생이 여기에 답변을 작성합니다...</span>
                    </div>
                    {q.guideline && (
                      <p className="text-xs text-gray-600 mt-2">💡 {q.guideline}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('generate')}>
                다시 생성
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? '저장 중...' : '설문 저장'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}