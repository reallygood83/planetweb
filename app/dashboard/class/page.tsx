'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ClassList } from '@/components/class/ClassList'
import { CreateClassModal } from '@/components/class/CreateClassModal'
import { EditClassModal } from '@/components/class/EditClassModal'
import { ClassCreatedGuide } from '@/components/class/ClassCreatedGuide'
import { Class } from '@/types'

export default function ClassPage() {
  const { user, loading: authLoading } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [createdClass, setCreatedClass] = useState<Class | null>(null)

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/classes')
      const data = await response.json()

      if (data.success) {
        setClasses(data.data)
      } else {
        setError(data.error || '학급 목록을 불러오는데 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClass = async (classData: Omit<Class, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      })

      const data = await response.json()

      if (data.success) {
        setClasses([data.data, ...classes])
        setCreateModalOpen(false)
        setCreatedClass(data.data)
        
        // 새로운 학급 코드 안내
        if (data.data.school_code) {
          alert(`학급이 생성되었습니다!\n\n학급 코드: ${data.data.school_code}\n\n이 코드는 학생들이 설문에 참여할 때 사용합니다.\n안전한 코드 생성 시스템을 통해 중복 방지된 코드입니다.`)
        }
        
        setShowGuide(true)
      } else {
        setError(data.error || '학급 생성에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleEditClass = async (classData: Omit<Class, 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!selectedClass) return

    try {
      const response = await fetch(`/api/classes/${selectedClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      })

      const data = await response.json()

      if (data.success) {
        setClasses(classes.map(c => c.id === selectedClass.id ? data.data : c))
        setEditModalOpen(false)
        setSelectedClass(null)
      } else {
        setError(data.error || '학급 수정에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('정말로 이 학급을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setClasses(classes.filter(c => c.id !== classId))
      } else {
        setError(data.error || '학급 삭제에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const openEditModal = (classData: Class) => {
    setSelectedClass(classData)
    setEditModalOpen(true)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로그인이 필요합니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학급 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            담당 학급과 학생들을 관리하세요.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          새 학급 만들기
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>학급이 없습니다</CardTitle>
            <CardDescription>
              첫 번째 학급을 만들어 시작해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateModalOpen(true)}>
              첫 학급 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ClassList
          classes={classes}
          onEdit={openEditModal}
          onDelete={handleDeleteClass}
          onCodeUpdated={(classId, newCode) => {
            setClasses(classes.map(c => 
              c.id === classId ? { ...c, school_code: newCode } : c
            ))
          }}
        />
      )}

      <CreateClassModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateClass}
      />

      {selectedClass && (
        <EditClassModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSubmit={handleEditClass}
          classData={selectedClass}
        />
      )}

      {showGuide && createdClass && (
        <ClassCreatedGuide
          className={createdClass.class_name}
          studentCount={createdClass.students?.length || 0}
          onDismiss={() => setShowGuide(false)}
        />
      )}
    </div>
  )
}