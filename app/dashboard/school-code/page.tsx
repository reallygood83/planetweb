'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { 
  Users, 
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
  group_name: string
  description: string
  school_name: string
  target_grade?: string
  primary_subject?: string
  creator_id: string
  creator_email: string
  members: string[]
  created_at: string
  updated_at: string
}

export default function SchoolCodePage() {
  const { user } = useAuth()
  const [schoolCodes, setSchoolCodes] = useState<SchoolCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // 생성 폼 상태
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [primarySubject, setPrimarySubject] = useState('')
  const [creating, setCreating] = useState(false)
  
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
      const response = await fetch('/api/school-codes')
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

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName || !description || !schoolName) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/school-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_name: groupName,
          description,
          school_name: schoolName,
          target_grade: targetGrade || null,
          primary_subject: primarySubject || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setSchoolCodes([data.data, ...schoolCodes])
        setShowCreateForm(false)
        // 폼 초기화
        setGroupName('')
        setDescription('')
        setSchoolName('')
        setTargetGrade('')
        setPrimarySubject('')
        
        alert(`학교 코드가 생성되었습니다: ${data.data.code}`)
      } else {
        alert(data.error || '학교 코드 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating school code:', error)
      alert('학교 코드 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode || joinCode.length !== 6) {
      alert('6자리 학교 코드를 입력해주세요.')
      return
    }

    setJoining(true)
    try {
      const response = await fetch('/api/school-codes/join', {
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
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            새 그룹 만들기
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>새 협업 그룹 만들기</CardTitle>
            <CardDescription>
              학교 코드를 생성하여 동료 교사들과 자료를 공유하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">그룹 이름 *</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="예: 5학년 교사 모임"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">학교명 *</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="예: 박달초등학교"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">그룹 설명 *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="그룹의 목적과 활동 내용을 설명해주세요."
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
                    placeholder="예: 5학년"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primarySubject">주요 과목 (선택)</Label>
                  <Input
                    id="primarySubject"
                    value={primarySubject}
                    onChange={(e) => setPrimarySubject(e.target.value)}
                    placeholder="예: 전과목"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? '생성 중...' : '그룹 생성'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Join Form */}
      {showJoinForm && (
        <Card>
          <CardHeader>
            <CardTitle>학교 코드로 참여</CardTitle>
            <CardDescription>
              동료 교사로부터 받은 6자리 코드를 입력하세요.
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
                  placeholder="예: ABC123"
                  maxLength={6}
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
                      {code.group_name}
                      {code.creator_id === user?.id && (
                        <Badge variant="secondary">관리자</Badge>
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
                  {code.target_grade && (
                    <div>{code.target_grade}</div>
                  )}
                  {code.primary_subject && (
                    <div>{code.primary_subject}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {code.members.length}명 참여
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(code.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                
                {code.creator_id === user?.id && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => {
                        const shareText = `[${code.group_name}] 그룹에 참여하세요!\n\n학교 코드: ${code.code}\n설명: ${code.description}`
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