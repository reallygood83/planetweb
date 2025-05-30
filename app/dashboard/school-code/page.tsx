'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { CreateSchoolCodeModal } from '@/components/school-code/CreateSchoolCodeModal'
import { 
  Copy, 
  Check, 
  Plus,
  School,
  Calendar,
  UserPlus,
  Share2
} from 'lucide-react'

interface SchoolCode {
  id: string
  code: string
  name: string
  description: string
  school_name: string
  creator_id: string
  settings?: {
    target_grade?: string
    primary_subject?: string
  }
  members?: Array<{
    user_id: string
    email: string
    role: string
    joined_at: string
  }>
  role?: 'creator' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export default function SchoolCodePage() {
  const { user } = useAuth()
  const [schoolCodes, setSchoolCodes] = useState<SchoolCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // 참여 폼 상태
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSchoolCodes()
    }
  }, [user])

  const fetchSchoolCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/school-codes-simple')
      const data = await response.json()

      if (data.success) {
        setSchoolCodes(data.data)
      }
    } catch (error) {
      console.error('Error fetching school codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCode = async (data: {
    code: string
    group_name: string
    description: string
    school_name: string
    target_grade?: string
    primary_subject?: string
  }) => {
    try {
      const response = await fetch('/api/school-codes-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setSchoolCodes([result.data, ...schoolCodes])
        setShowCreateModal(false)
        alert(`학교 코드가 생성되었습니다: ${result.data.code}`)
      } else {
        alert(result.error || '학교 코드 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating school code:', error)
      alert('학교 코드 생성 중 오류가 발생했습니다.')
    }
  }

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode || joinCode.length < 4) {
      alert('4자리 이상의 학교 코드를 입력해주세요.')
      return
    }

    setJoining(true)
    try {
      const response = await fetch('/api/school-codes-simple/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: joinCode.toUpperCase() })
      })

      const data = await response.json()

      if (data.success) {
        await fetchSchoolCodes() // 목록 새로고침
        setShowJoinForm(false)
        setJoinCode('')
        alert(data.message || '그룹에 참여했습니다.')
      } else {
        alert(data.error || '학교 코드 참여에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error joining school code:', error)
      alert('학교 코드 참여 중 오류가 발생했습니다.')
    } finally {
      setJoining(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학교 코드 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            동료 교사들과 평가계획을 공유하고 협업하세요.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">💡 학급 코드와 학교 코드의 차이</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>학급 코드</strong>: 학생들이 설문에 참여할 때 사용 (학급별 자동 생성)</li>
              <li>• <strong>학교 코드</strong>: 교사들이 평가계획을 공유할 때 사용 (그룹별 생성)</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowJoinForm(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            코드로 참여
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            새 그룹 만들기
          </Button>
        </div>
      </div>

      {/* Create Modal */}
      <CreateSchoolCodeModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateCode}
      />

      {/* Join Form */}
      {showJoinForm && (
        <Card>
          <CardHeader>
            <CardTitle>학교 코드로 참여</CardTitle>
            <CardDescription>
              동료 교사로부터 받은 4-10자리 코드를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">학교 코드</Label>
                <Input
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="예: SCHOOL1, ABC123"
                  maxLength={10}
                  className="font-mono text-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJoinForm(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={joining}>
                  {joining ? '참여 중...' : '참여하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* School Codes List */}
      {schoolCodes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              참여 중인 그룹이 없습니다
            </h3>
            <p className="text-gray-500 mb-4">
              새 그룹을 만들거나 학교 코드로 참여하세요
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schoolCodes.map((code) => (
            <Card key={code.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {code.name}
                      {(code.creator_id === user?.id || code.role === 'admin') && (
                        <Badge variant="secondary">관리자</Badge>
                      )}
                      {code.role === 'member' && (
                        <Badge variant="outline">멤버</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {code.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                      {code.code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(code.code)}
                    >
                      {copiedCode === code.code ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <School className="h-4 w-4" />
                    {code.school_name}
                  </div>
                  {code.settings?.target_grade && (
                    <div>{code.settings.target_grade}</div>
                  )}
                  {code.settings?.primary_subject && (
                    <div>{code.settings.primary_subject}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <UserPlus className="h-4 w-4" />
                    {(code.members?.length || 0) + 1}명 참여 {/* +1 for creator */}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(code.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                
                {(code.creator_id === user?.id || code.role === 'admin') && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => {
                        const shareText = `[${code.name}] 그룹에 참여하세요!\n\n학교 코드: ${code.code}\n설명: ${code.description}`
                        navigator.clipboard.writeText(shareText)
                        alert('초대 메시지가 복사되었습니다.')
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                      초대 메시지 복사
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}