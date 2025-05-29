'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleCodeDisplayProps {
  code: string
  codeType: 'SCHOOL' | 'CLASS'
  className?: string
}

export function SimpleCodeDisplay({ code, codeType, className }: SimpleCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const displayName = codeType === 'SCHOOL' ? '학교 코드' : '학급 코드'
  const description = codeType === 'SCHOOL' 
    ? '교사 간 협업용' 
    : '학생 설문 참여용'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 코드 타입 라벨 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{displayName}:</span>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
      
      {/* 코드 표시 및 복사 버튼 */}
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
      </div>
      
      {/* 코드 형식 설명 */}
      <div className="text-xs text-gray-500">
        형식: {codeType === 'SCHOOL' ? 'S' : 'C'}XXXXX (6자리)
      </div>
    </div>
  )
}