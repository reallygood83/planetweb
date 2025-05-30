'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, X } from 'lucide-react'

interface CreateSchoolCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    code: string
    group_name: string
    description: string
    school_name: string
    target_grade?: string
    primary_subject?: string
  }) => void
}

export function CreateSchoolCodeModal({ open, onOpenChange, onSubmit }: CreateSchoolCodeModalProps) {
  const [code, setCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [primarySubject, setPrimarySubject] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code || !groupName || !description || !schoolName) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    // 코드 형식 검증 (영문 대문자와 숫자만 허용, 4-10자)
    const codePattern = /^[A-Z0-9]{4,10}$/
    if (!codePattern.test(code.toUpperCase())) {
      alert('코드는 4-10자의 영문 대문자와 숫자로만 구성되어야 합니다.')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        code: code.toUpperCase(), // 대문자로 변환
        group_name: groupName,
        description,
        school_name: schoolName,
        target_grade: targetGrade || undefined,
        primary_subject: primarySubject || undefined
      })
      
      // 폼 초기화
      setCode('')
      setGroupName('')
      setDescription('')
      setSchoolName('')
      setTargetGrade('')
      setPrimarySubject('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">새 학교 코드 생성</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          교사들이 협업할 수 있는 학교 그룹을 만듭니다.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              학교 코드 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: SCHOOL1, ABC123"
              maxLength={10}
              required
            />
            <p className="text-sm text-gray-500">
              4-10자의 영문 대문자와 숫자로 구성된 고유한 코드를 입력하세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupName">
              그룹명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: 2024학년도 3학년 협업 그룹"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolName">
              학교명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="예: 한국초등학교"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              설명 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="그룹의 목적과 활동 내용을 간단히 설명해주세요."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetGrade">대상 학년 (선택)</Label>
              <Input
                id="targetGrade"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="예: 3학년"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primarySubject">주요 과목 (선택)</Label>
              <Input
                id="primarySubject"
                value={primarySubject}
                onChange={(e) => setPrimarySubject(e.target.value)}
                placeholder="예: 국어"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">코드 생성 안내</p>
              <p>• 다른 교사들이 이 코드로 그룹에 참여할 수 있습니다.</p>
              <p>• 코드는 한번 생성되면 변경할 수 없으니 신중히 입력해주세요.</p>
              <p>• 기억하기 쉬운 코드를 사용하는 것을 권장합니다.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '생성 중...' : '학교 코드 생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}