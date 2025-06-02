'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { X, Sparkles, Upload, FileText, File } from 'lucide-react'

interface SmartPasteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (analyzedData: EvaluationPlan) => void
}

export function SmartPasteModal({ open, onOpenChange, onSuccess }: SmartPasteModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    const fileType = file.type
    const fileName = file.name.toLowerCase()

    try {
      let extractedText = ''

      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        // 텍스트 파일
        extractedText = await file.text()
      } else if (fileName.endsWith('.md')) {
        // 마크다운 파일
        extractedText = await file.text()
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // PDF 파일 - PDF.js 라이브러리 필요
        setError('PDF 파일 지원은 준비 중입니다. 텍스트로 복사해서 붙여넣어 주세요.')
        return
      } else {
        setError('지원하지 않는 파일 형식입니다. (.txt, .md 파일만 지원)')
        return
      }

      setText(extractedText)
      setInputMethod('text') // 텍스트 모드로 전환
    } catch (error) {
      console.error('파일 읽기 오류:', error)
      setError('파일을 읽는 중 오류가 발생했습니다.')
    }
  }

  const handleAnalyze = async () => {
    let contentToAnalyze = text.trim()

    if (inputMethod === 'file' && uploadedFile) {
      await handleFileUpload(uploadedFile)
      return // 파일 업로드 후 텍스트 모드로 전환됨
    }

    if (!contentToAnalyze) {
      setError('평가계획서 내용을 입력하거나 파일을 업로드해주세요.')
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
          text: contentToAnalyze,
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
          {/* 탭 선택 */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setInputMethod('text')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                inputMethod === 'text'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              텍스트 붙여넣기
            </button>
            <button
              onClick={() => setInputMethod('file')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                inputMethod === 'file'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              파일 업로드
            </button>
          </div>

          {/* 텍스트 입력 */}
          {inputMethod === 'text' && (
            <div>
              <Label htmlFor="text">평가계획서 텍스트</Label>
              <p className="text-sm text-gray-600 mb-2">
                기존 평가계획서의 내용을 복사해서 붙여넣으면 AI가 자동으로 분석하여 구조화합니다.
                표 형태의 계획서도 텍스트로 복사하면 AI가 이해할 수 있습니다.
              </p>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="평가계획서 내용을 여기에 붙여넣으세요..."
                className="w-full min-h-[300px] p-3 border border-gray-300 rounded-lg resize-none"
              />
            </div>
          )}

          {/* 파일 업로드 */}
          {inputMethod === 'file' && (
            <div>
              <Label>파일 업로드</Label>
              <p className="text-sm text-gray-600 mb-2">
                텍스트 파일(.txt) 또는 마크다운 파일(.md)을 업로드하세요.
                PDF 지원은 준비 중입니다.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setUploadedFile(file)
                      setError(null)
                    }
                  }}
                  className="hidden"
                />
                
                {uploadedFile ? (
                  <div className="space-y-2">
                    <File className="h-8 w-8 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-700">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      파일 크기: {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      다른 파일 선택
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      파일을 클릭하여 선택하거나 여기에 드래그하세요
                    </p>
                    <p className="text-xs text-gray-500">
                      지원 형식: .txt, .md (PDF는 준비 중)
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      파일 선택
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

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
              disabled={loading || (inputMethod === 'text' && !text.trim()) || (inputMethod === 'file' && !uploadedFile)}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>분석 중...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI 분석 시작 {inputMethod === 'file' ? '(파일)' : '(텍스트)'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}