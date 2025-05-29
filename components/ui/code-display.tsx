'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeDisplayProps {
  code: string
  codeType: 'SCHOOL' | 'CLASS'
  recordId: string
  onCodeUpdated?: (newCode: string) => void
  showRegenerate?: boolean
  className?: string
}

export function CodeDisplay({ 
  code, 
  codeType, 
  recordId,
  onCodeUpdated,
  showRegenerate = true,
  className 
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = codeType === 'SCHOOL' ? '학교 코드' : '학급 코드'
  const description = codeType === 'SCHOOL' 
    ? '교사 간 협업을 위한 학교 그룹 코드' 
    : '학생들이 설문에 참여할 때 사용하는 코드'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  const handleRegenerate = async () => {
    if (!showRegenerate) return
    
    setRegenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/codes/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldCode: code,
          recordId
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.newCode) {
        onCodeUpdated?.(result.newCode)
      } else {
        setError(result.error || '코드 재생성에 실패했습니다.')
      }
    } catch (err) {
      console.error('코드 재생성 오류:', err)
      setError('코드 재생성 중 오류가 발생했습니다.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 코드 타입 라벨 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{displayName}:</span>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
      
      {/* 코드 표시 및 액션 */}
      <div className="flex items-center gap-2">
        <code className={cn(
          "bg-gray-100 px-3 py-2 rounded-md font-mono text-lg font-semibold tracking-wider",
          codeType === 'SCHOOL' ? "text-blue-700 bg-blue-50" : "text-green-700 bg-green-50"
        )}>
          {code}
        </code>
        
        {/* 복사 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-10 w-10 p-0"
          title={`${displayName} 복사`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        
        {/* 재생성 버튼 */}
        {showRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="h-10 w-10 p-0"
            title="새 코드 생성"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              regenerating && "animate-spin"
            )} />
          </Button>
        )}
      </div>
      
      {/* 오류 메시지 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      {/* 코드 형식 설명 */}
      <div className="text-xs text-gray-500">
        형식: {codeType === 'SCHOOL' ? 'S' : 'C'}XXXXX (6자리, 혼동되는 문자 제외)
      </div>
    </div>
  )
}