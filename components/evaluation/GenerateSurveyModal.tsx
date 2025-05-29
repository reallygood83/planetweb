'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { X, Sparkles, Loader2 } from 'lucide-react'

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
  evaluationPlan: EvaluationPlan | null
  onSuccess: (survey: any) => void
}

export function GenerateSurveyModal({ 
  open, 
  onOpenChange, 
  evaluationPlan, 
  onSuccess 
}: GenerateSurveyModalProps) {
  const [customTitle, setCustomTitle] = useState('')
  const [generatedSurvey, setGeneratedSurvey] = useState<GeneratedSurvey | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'generate' | 'preview' | 'save'>('generate')

  const handleGenerate = async () => {
    if (!evaluationPlan) return

    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) {
      setError('먼저 API 키를 설정해주세요.')
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
          evaluationPlan,
          apiKey: apiKey.replace(/"/g, '')
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
    if (!generatedSurvey || !evaluationPlan) return

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
          evaluation_plan_id: evaluationPlan.id,
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
    setStep('generate')
    setGeneratedSurvey(null)
    setCustomTitle('')
    setError(null)
    onOpenChange(false)
  }

  if (!open || !evaluationPlan) return null

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

        {/* 평가계획 정보 */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900">평가계획 정보</h3>
          <p className="text-blue-800">
            {evaluationPlan.subject} • {evaluationPlan.grade} • {evaluationPlan.semester}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            {evaluationPlan.unit} {evaluationPlan.lesson && `• ${evaluationPlan.lesson}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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
                {generatedSurvey.questions.multipleChoice.map((q, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">{index + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((option, optIndex) => (
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
                {generatedSurvey.questions.shortAnswer.map((q, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">
                      {generatedSurvey.questions.multipleChoice.length + index + 1}. {q.question}
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