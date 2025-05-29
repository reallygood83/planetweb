'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Sparkles, AlertCircle, Copy, Check } from 'lucide-react'

interface GenerateRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  responseData: {
    id: string
    student_name: string
    class_name: string
    survey?: {
      title: string
      evaluation_plan?: {
        subject: string
        grade: string
        semester: string
        unit: string
      }
    }
  }
}

type RecordType = '교과학습발달상황' | '창의적 체험활동 누가기록' | '행동특성 및 종합의견'

export function GenerateRecordModal({ open, onOpenChange, responseData }: GenerateRecordModalProps) {
  const [recordType, setRecordType] = useState<RecordType>('교과학습발달상황')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/records/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: responseData.id,
          recordType,
          teacherNotes,
          includeEvaluationCriteria: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedContent(data.data.content)
        setCharCount(data.data.content.length)
      } else {
        alert('생기부 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error generating record:', error)
      alert('생기부 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleEdit = (text: string) => {
    setGeneratedContent(text)
    setCharCount(text.length)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/records/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: responseData.id,
          recordType,
          content: generatedContent,
          metadata: {
            studentName: responseData.student_name,
            className: responseData.class_name,
            subject: responseData.survey?.evaluation_plan?.subject,
            unit: responseData.survey?.evaluation_plan?.unit,
            teacherNotes
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('생기부가 성공적으로 저장되었습니다.')
        onOpenChange(false)
      } else {
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error saving record:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI 생기부 생성
              </CardTitle>
              <CardDescription className="mt-1">
                {responseData.student_name} • {responseData.class_name} • 
                {responseData.survey?.evaluation_plan?.subject} {responseData.survey?.evaluation_plan?.unit}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: 생성 설정 */}
          {!generatedContent && (
            <>
              {/* 기록 유형 선택 */}
              <div className="space-y-3">
                <Label>생성할 기록 유형</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['교과학습발달상황', '창의적 체험활동 누가기록', '행동특성 및 종합의견'] as RecordType[]).map((type) => (
                    <Card 
                      key={type}
                      className={`cursor-pointer transition-all ${
                        recordType === type ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                      }`}
                      onClick={() => setRecordType(type)}
                    >
                      <CardContent className="p-4">
                        <div className="font-medium mb-1">{type}</div>
                        <div className="text-xs text-gray-600">
                          {type === '교과학습발달상황' && '교과별 성취기준에 따른 학습 발달 상황'}
                          {type === '창의적 체험활동 누가기록' && '자율·동아리·봉사·진로활동 관련 기록'}
                          {type === '행동특성 및 종합의견' && '인성, 태도, 학습 습관 등 종합 관찰'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 교사 관찰 내용 */}
              <div className="space-y-3">
                <Label htmlFor="teacherNotes">교사 관찰 내용 (선택)</Label>
                <Textarea
                  id="teacherNotes"
                  placeholder="학생의 수업 태도, 특별한 성취, 개선점 등을 입력하세요..."
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  교사의 직접 관찰 내용을 추가하면 더 정확한 생기부가 생성됩니다.
                </p>
              </div>

              {/* NEIS 규정 안내 */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 mb-1">NEIS 생기부 작성 규정</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• 학생 이름은 자동으로 제외됩니다</li>
                      <li>• 모든 문장은 명사형으로 종결됩니다 (예: ~함, ~임, ~됨)</li>
                      <li>• 최대 500자 이내로 생성됩니다</li>
                      <li>• 객관적이고 구체적인 사실 위주로 작성됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 생성 버튼 */}
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    생기부 생성하기
                  </>
                )}
              </Button>
            </>
          )}

          {/* Step 2: 생성 결과 */}
          {generatedContent && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>생성된 {recordType}</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={charCount > 500 ? 'destructive' : 'secondary'}>
                      {charCount}/500자
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          복사
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  value={generatedContent}
                  onChange={(e) => handleEdit(e.target.value)}
                  rows={10}
                  className="font-medium"
                />
                
                <p className="text-xs text-gray-500">
                  생성된 내용을 검토하고 필요시 수정한 후 사용하세요.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedContent('')
                    setCharCount(0)
                  }}
                  className="flex-1"
                >
                  다시 생성
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? '저장 중...' : '저장하기'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}