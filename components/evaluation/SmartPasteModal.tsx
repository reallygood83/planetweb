'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { X, Sparkles } from 'lucide-react'

interface SmartPasteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (analyzedData: EvaluationPlan) => void
}

export function SmartPasteModal({ open, onOpenChange, onSuccess }: SmartPasteModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('평가계획서 텍스트를 입력해주세요.')
      return
    }

    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) {
      setError('먼저 API 키를 설정해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/evaluations/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          apiKey: apiKey.replace(/"/g, '') // Remove quotes if any
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Create the evaluation plan
        const createResponse = await fetch('/api/evaluations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data.data),
        })

        const createData = await createResponse.json()

        if (createData.success) {
          onSuccess(createData.data)
          setText('')
        } else {
          setError(createData.error || '평가계획 생성에 실패했습니다.')
        }
      } else {
        setError(data.error || 'AI 분석에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold">스마트 복사&붙여넣기</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="text">평가계획서 텍스트</Label>
            <p className="text-sm text-gray-600 mb-2">
              기존 평가계획서의 내용을 복사해서 붙여넣으면 AI가 자동으로 분석하여 구조화합니다.
            </p>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="평가계획서 내용을 여기에 붙여넣으세요..."
              className="w-full min-h-[300px] p-3 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !text.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>분석 중...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI 분석 시작
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}