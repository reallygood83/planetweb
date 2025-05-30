'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Copy, Users, CheckCircle, QrCode } from 'lucide-react'

interface Survey {
  id: string
  title: string
  description?: string
}

interface ShareSurveyModalProps {
  survey: Survey | null
  classId?: string
  isOpen: boolean
  onClose: () => void
}

export function ShareSurveyModal({ survey, classId, isOpen, onClose }: ShareSurveyModalProps) {
  const [accessCode, setAccessCode] = useState<string>('')
  const [surveyUrl, setSurveyUrl] = useState<string>('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [maxResponses, setMaxResponses] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generated, setGenerated] = useState(false)

  if (!isOpen || !survey) return null

  const handleGenerateAccess = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/share/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          classId,
          expiresInDays,
          maxResponses: maxResponses || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '접근 코드 생성에 실패했습니다.')
      }

      setAccessCode(data.accessCode)
      setSurveyUrl(data.surveyUrl)
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
    setAccessCode('')
    setSurveyUrl('')
    setExpiresInDays(7)
    setMaxResponses('')
    setGenerated(false)
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">설문 공유</CardTitle>
            <CardDescription>{survey.title}</CardDescription>
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
                  <Label htmlFor="expiry">접근 코드 유효기간</Label>
                  <select
                    id="expiry"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={1}>1일</option>
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="max-responses">
                    최대 응답 수 (선택사항)
                  </Label>
                  <Input
                    id="max-responses"
                    type="number"
                    value={maxResponses}
                    onChange={(e) => setMaxResponses(e.target.value ? Number(e.target.value) : '')}
                    placeholder="제한 없음"
                    min={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 응답 수 제한이 없습니다.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGenerateAccess}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  '생성 중...'
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    접근 코드 생성
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">접근 코드가 생성되었습니다!</p>
                </div>

                <div>
                  <Label>접근 코드</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={accessCode}
                      readOnly
                      className="font-mono text-2xl text-center font-bold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(accessCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>설문 링크</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={surveyUrl}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(surveyUrl)}
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

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    학생 안내 방법:
                  </p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>접근 코드 <strong>{accessCode}</strong>를 학생들에게 공유</li>
                    <li>학생들은 링크 접속 후 이름만 입력</li>
                    <li>로그인 없이 바로 설문 참여 가능</li>
                  </ol>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  <p className="font-semibold mb-1">설정 정보:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>유효기간: {expiresInDays}일</li>
                    <li>최대 응답: {maxResponses || '제한 없음'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateAccess}
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