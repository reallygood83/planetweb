'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Search, Eye, Calendar, User, ExternalLink } from 'lucide-react'

interface SharedEvaluation {
  id: string
  title: string
  subject: string
  grade: string
  semester: string
  unit?: string
  share_code: string
  allow_copy: boolean
  view_count: number
  shared_by: string
  expires_at: string | null
  created_at: string
}

interface SharedEvaluationBrowserProps {
  onCopySuccess?: () => void
}

export function SharedEvaluationBrowser({ onCopySuccess }: SharedEvaluationBrowserProps) {
  const [sharedEvaluations, setSharedEvaluations] = useState<SharedEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copyingStates, setCopyingStates] = useState<{ [key: string]: boolean }>({})

  const searchSharedEvaluations = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setError(null)
      
      // 실제로는 검색 API를 구현해야 하지만, 
      // 지금은 데모용으로 빈 배열 반환
      setSharedEvaluations([])
      
    } catch {
      setError('검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadSharedEvaluationByCode = async () => {
    if (!shareCode.trim()) {
      setError('공유 코드를 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/share/evaluation?code=${shareCode}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '공유된 평가계획을 찾을 수 없습니다.')
      }

      // 단일 평가계획을 목록에 추가
      const sharedEval: SharedEvaluation = {
        id: data.evaluation.id,
        title: data.evaluation.title,
        subject: data.evaluation.subject,
        grade: data.evaluation.grade,
        semester: data.evaluation.semester,
        unit: data.evaluation.unit,
        share_code: shareCode,
        allow_copy: data.allowCopy,
        view_count: data.viewCount,
        shared_by: data.sharedBy,
        expires_at: data.expiresAt,
        created_at: data.evaluation.created_at
      }

      setSharedEvaluations([sharedEval])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyEvaluation = async (shareCode: string) => {
    try {
      setCopyingStates(prev => ({ ...prev, [shareCode]: true }))
      
      const response = await fetch('/api/evaluations/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareCode: shareCode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '복사에 실패했습니다.')
      }

      alert('평가계획이 성공적으로 복사되었습니다!')
      onCopySuccess?.()
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '복사 중 오류가 발생했습니다.')
    } finally {
      setCopyingStates(prev => ({ ...prev, [shareCode]: false }))
    }
  }

  const openSharedEvaluation = (shareCode: string) => {
    window.open(`/share/evaluation/${shareCode}`, '_blank')
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* 공유 코드로 직접 조회 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            공유 코드로 평가계획 조회
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="공유 코드를 입력하세요 (예: ABC123)"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && loadSharedEvaluationByCode()}
              className="flex-1"
            />
            <Button 
              onClick={loadSharedEvaluationByCode}
              disabled={loading || !shareCode.trim()}
            >
              {loading ? '조회 중...' : '조회'}
            </Button>
          </div>
          
          <p className="text-sm text-gray-600">
            다른 교사가 공유한 평가계획의 코드를 입력하여 조회할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 검색 기능 (미래 구현 예정) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            평가계획 검색
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="교과, 학년, 단원명 등으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSharedEvaluations()}
              className="flex-1"
              disabled
            />
            <Button 
              onClick={searchSharedEvaluations}
              disabled={true}
              variant="outline"
            >
              검색 (준비 중)
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            🚧 공개된 평가계획 검색 기능은 추후 업데이트될 예정입니다.
          </p>
        </CardContent>
      </Card>

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {sharedEvaluations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">조회된 평가계획</h3>
          
          {sharedEvaluations.map((evaluation) => (
            <Card key={evaluation.share_code} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold">{evaluation.title}</h4>
                      {isExpired(evaluation.expires_at) && (
                        <Badge variant="destructive">만료됨</Badge>
                      )}
                      {!evaluation.allow_copy && (
                        <Badge variant="outline">복사 불가</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                      <Badge variant="secondary">
                        {evaluation.subject} - {evaluation.grade}학년 {evaluation.semester}
                      </Badge>
                      {evaluation.unit && (
                        <Badge variant="outline">{evaluation.unit}</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>공유자: {evaluation.shared_by}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>조회수: {evaluation.view_count}회</span>
                      </div>
                      {evaluation.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            만료일: {new Date(evaluation.expires_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSharedEvaluation(evaluation.share_code)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      자세히 보기
                    </Button>
                    
                    {evaluation.allow_copy && !isExpired(evaluation.expires_at) && (
                      <Button
                        size="sm"
                        onClick={() => handleCopyEvaluation(evaluation.share_code)}
                        disabled={copyingStates[evaluation.share_code]}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-4 w-4" />
                        {copyingStates[evaluation.share_code] ? '복사 중...' : '복사하기'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      {sharedEvaluations.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              공유된 평가계획을 찾아보세요
            </h3>
            <p className="text-gray-600">
              공유 코드를 입력하여 다른 교사의 평가계획을 조회하고 복사할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}