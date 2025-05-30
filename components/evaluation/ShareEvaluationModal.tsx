'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Copy, Share2, CheckCircle } from 'lucide-react'
import { EvaluationPlan } from '@/lib/types/evaluation'

interface ShareEvaluationModalProps {
  evaluation: EvaluationPlan | null
  isOpen: boolean
  onClose: () => void
}

export function ShareEvaluationModal({ evaluation, isOpen, onClose }: ShareEvaluationModalProps) {
  const [shareCode, setShareCode] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string>('')
  const [allowCopy, setAllowCopy] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generated, setGenerated] = useState(false)

  if (!isOpen || !evaluation) return null

  const handleGenerateShare = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/share/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationPlanId: evaluation.id,
          allowCopy,
          expiresInDays
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '공유 링크 생성에 실패했습니다.')
      }

      setShareCode(data.shareCode)
      setShareUrl(data.shareUrl)
      setGenerated(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('복사에 실패했습니다.')
    }
  }

  const resetModal = () => {
    setShareCode('')
    setShareUrl('')
    setAllowCopy(false)
    setExpiresInDays(30)
    setGenerated(false)
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">평가계획 공유</CardTitle>
            <CardDescription>
              {evaluation.subject} - {evaluation.grade} {evaluation.semester}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={resetModal}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!generated ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="expiry">공유 링크 유효기간</Label>
                  <select
                    id="expiry"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={7}>7일</option>
                    <option value={30}>30일</option>
                    <option value={90}>90일</option>
                    <option value={365}>1년</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow-copy"
                    checked={allowCopy}
                    onCheckedChange={(checked) => setAllowCopy(checked as boolean)}
                  />
                  <Label htmlFor="allow-copy" className="text-sm font-normal">
                    다른 교사가 이 평가계획을 복사할 수 있도록 허용
                  </Label>
                </div>
              </div>

              <Button
                onClick={handleGenerateShare}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  '생성 중...'
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    공유 링크 생성
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">공유 링크가 생성되었습니다!</p>
                </div>

                <div>
                  <Label>공유 코드</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={shareCode}
                      readOnly
                      className="font-mono text-lg text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(shareCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>공유 링크</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(shareUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {copied && (
                  <p className="text-sm text-green-600 text-center">
                    클립보드에 복사되었습니다!
                  </p>
                )}

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-semibold mb-1">공유 설정:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>유효기간: {expiresInDays}일</li>
                    <li>복사 허용: {allowCopy ? '예' : '아니오'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateShare}
                  className="flex-1"
                >
                  재생성
                </Button>
                <Button
                  onClick={resetModal}
                  className="flex-1"
                >
                  완료
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}