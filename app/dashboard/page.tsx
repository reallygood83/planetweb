'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiKeyStatus } from '@/types'
import { encryptApiKey, getApiKeyHint, validateGeminiApiKey } from '@/lib/utils'

export default function DashboardPage() {
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({
    classCount: 0,
    studentCount: 0,
    evaluationCount: 0
  })
  const supabase = createClient()

  useEffect(() => {
    checkApiKeyStatus()
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // 학급 통계 조회
      const classResponse = await fetch('/api/classes')
      if (classResponse.ok) {
        const classData = await classResponse.json()
        if (classData.success) {
          const classes = classData.data
          const studentCount = classes.reduce((total: number, cls: any) => total + cls.students.length, 0)
          setStats(prev => ({
            ...prev,
            classCount: classes.length,
            studentCount
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const checkApiKeyStatus = async () => {
    const encryptedKey = localStorage.getItem('gemini_api_key')
    if (encryptedKey) {
      // In production, decrypt and validate
      setApiKeyStatus({
        hasKey: true,
        isValid: true,
        hint: localStorage.getItem('api_key_hint') || undefined,
        message: 'API 키가 설정되어 있습니다.'
      })
    } else {
      setApiKeyStatus({
        hasKey: false,
        isValid: false,
        message: 'API 키를 설정해주세요.'
      })
    }
  }

  const handleSaveApiKey = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Validate API key format
      if (!validateGeminiApiKey(apiKey)) {
        throw new Error('올바른 Gemini API 키 형식이 아닙니다.')
      }

      // Encrypt and save to localStorage
      const encrypted = encryptApiKey(apiKey, process.env.NEXT_PUBLIC_ENCRYPT_KEY!)
      localStorage.setItem('gemini_api_key', encrypted)
      
      // Save hint
      const hint = getApiKeyHint(apiKey)
      localStorage.setItem('api_key_hint', hint)

      // Update user profile with encrypted key and hint
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ 
            api_key_hint: hint,
            encrypted_api_key: encrypted 
          })
          .eq('id', user.id)
      }

      setMessage('API 키가 성공적으로 저장되었습니다.')
      setApiKey('')
      checkApiKeyStatus()
    } catch (error: any) {
      setMessage(error.message || 'API 키 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">아이빛 대시보드</h1>
        <p className="mt-2 text-sm text-gray-600">
          학생 자기평가 기반 생기부 AI에 오신 것을 환영합니다. 시작하려면 API 키를 설정해주세요.
        </p>
      </div>

      {/* API Key Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle>Gemini API 키 설정</CardTitle>
          <CardDescription>
            Google AI Studio에서 발급받은 API 키를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeyStatus && (
            <div className={`p-3 rounded-lg ${apiKeyStatus.hasKey ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {apiKeyStatus.message}
              {apiKeyStatus.hint && <span className="ml-2 font-mono">({apiKeyStatus.hint})</span>}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">API 키</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          
          {message && (
            <div className={`text-sm ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button onClick={handleSaveApiKey} disabled={loading || !apiKey}>
              {loading ? '저장 중...' : 'API 키 저장'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}
            >
              API 키 발급하기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">평가계획</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.evaluationCount}</p>
            <p className="text-sm text-gray-500">등록된 평가계획</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">학급</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.classCount}</p>
            <p className="text-sm text-gray-500">관리중인 학급</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">학생</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.studentCount}</p>
            <p className="text-sm text-gray-500">등록된 학생</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide */}
      <Card>
        <CardHeader>
          <CardTitle>시작하기</CardTitle>
          <CardDescription>
            아이빛으로 학생 중심 생기부를 만드는 방법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex space-x-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                1
              </span>
              <div>
                <p className="font-medium">API 키 설정</p>
                <p className="text-sm text-gray-600">
                  위에서 Gemini API 키를 설정하세요. 무료로 사용할 수 있습니다.
                </p>
              </div>
            </li>
            <li className="flex space-x-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                2
              </span>
              <div>
                <p className="font-medium">학급과 학생 등록</p>
                <p className="text-sm text-gray-600">
                  담당 학급과 학생들을 등록하고 기본 정보를 설정하세요.
                </p>
              </div>
            </li>
            <li className="flex space-x-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                3
              </span>
              <div>
                <p className="font-medium">자기평가 설문 생성</p>
                <p className="text-sm text-gray-600">
                  AI가 교육과정에 맞는 학생 자기평가 설문을 자동으로 만들어줍니다.
                </p>
              </div>
            </li>
            <li className="flex space-x-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                4
              </span>
              <div>
                <p className="font-medium">맞춤형 생기부 생성</p>
                <p className="text-sm text-gray-600">
                  학생의 자기평가와 교사 관찰을 종합하여 개인별 생기부를 작성합니다.
                </p>
              </div>
            </li>
          </ol>
          
          <div className="mt-6 flex gap-3">
            <Button 
              onClick={() => window.location.href = '/dashboard/generate-record'}
              className="flex-1"
            >
              개별 생성
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard/generate-batch'}
              variant="outline"
              className="flex-1"
            >
              일괄 생성
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}