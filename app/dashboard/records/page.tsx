'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { FileText, Download, Calendar, User, BookOpen, Copy, Check } from 'lucide-react'

interface GeneratedRecord {
  id: string
  response_id: string
  record_type: string
  content: string
  metadata: {
    studentName: string
    className: string
    subject?: string
    unit?: string
    teacherNotes?: string
  }
  created_at: string
}

export default function RecordsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<GeneratedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchRecords()
    }
  }, [user])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/records')
      const data = await response.json()

      if (data.success) {
        setRecords(data.data)
      }
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/records/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds: records.map(r => r.id)
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `생기부_${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting records:', error)
      alert('내보내기 중 오류가 발생했습니다.')
    }
  }

  // 필터링된 기록
  const filteredRecords = records.filter(record => {
    if (selectedType === 'all') return true
    return record.record_type === selectedType
  })

  // 기록 타입별 통계
  const recordStats = {
    total: records.length,
    byType: {
      '교과학습발달상황': records.filter(r => r.record_type === '교과학습발달상황').length,
      '창의적 체험활동 누가기록': records.filter(r => r.record_type === '창의적 체험활동 누가기록').length,
      '행동특성 및 종합의견': records.filter(r => r.record_type === '행동특성 및 종합의견').length
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">생기부 기록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">생성된 생기부 관리</h1>
        <p className="text-gray-600">AI로 생성된 생기부 기록을 확인하고 관리할 수 있습니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">교과학습발달상황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordStats.byType['교과학습발달상황']}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">창체 누가기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordStats.byType['창의적 체험활동 누가기록']}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">행동특성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordStats.byType['행동특성 및 종합의견']}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Export */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>필터 및 내보내기</CardTitle>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Excel 내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
            >
              전체
            </Button>
            <Button
              variant={selectedType === '교과학습발달상황' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('교과학습발달상황')}
            >
              교과학습발달상황
            </Button>
            <Button
              variant={selectedType === '창의적 체험활동 누가기록' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('창의적 체험활동 누가기록')}
            >
              창의적 체험활동
            </Button>
            <Button
              variant={selectedType === '행동특성 및 종합의견' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('행동특성 및 종합의견')}
            >
              행동특성
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle>생기부 기록 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 생성된 생기부 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{record.record_type}</Badge>
                      <span className="font-medium">{record.metadata.studentName}</span>
                      <span className="text-sm text-gray-500">{record.metadata.className}</span>
                      {record.metadata.subject && (
                        <span className="text-sm text-gray-500">{record.metadata.subject}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(record.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded mb-2">
                    <p className="text-sm whitespace-pre-wrap">{record.content}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="h-3 w-3" />
                      {record.content.length}자
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(record.content, record.id)}
                    >
                      {copiedId === record.id ? (
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}