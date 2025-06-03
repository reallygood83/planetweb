'use client'

import { useState, useEffect } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { EvaluationManager } from '@/components/evaluation/EvaluationManager'
import { CreateEvaluationModal } from '@/components/evaluation/CreateEvaluationModal'
import { EditEvaluationModal } from '@/components/evaluation/EditEvaluationModal'
import { SmartPasteModal } from '@/components/evaluation/SmartPasteModal'
import { GenerateSurveyModal } from '@/components/evaluation/GenerateSurveyModal'
import { ShareEvaluationModal } from '@/components/evaluation/ShareEvaluationModal'
import { SharedEvaluationBrowser } from '@/components/evaluation/SharedEvaluationBrowser'
import { SharedEvaluationModal } from '@/components/evaluation/SharedEvaluationModal'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { Plus, FileText, Sparkles, Search } from 'lucide-react'

export default function EvaluationPage() {
  const { user, loading: authLoading } = useAuth()
  const [evaluations, setEvaluations] = useState<EvaluationPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [smartPasteOpen, setSmartPasteOpen] = useState(false)
  const [surveyModalOpen, setSurveyModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [sharedEvaluationModalOpen, setSharedEvaluationModalOpen] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationPlan | null>(null)

  useEffect(() => {
    if (user) {
      fetchEvaluations()
    }
  }, [user])

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evaluations')
      const data = await response.json()

      if (data.success) {
        setEvaluations(data.data)
      } else {
        setError('평가계획 목록을 불러오는데 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvaluation = async (evaluationData: Omit<EvaluationPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData),
      })

      const data = await response.json()

      if (data.success) {
        setEvaluations([data.data, ...evaluations])
        setCreateModalOpen(false)
      } else {
        console.error('Error creating evaluation:', data)
        setError(data.error || '평가계획 생성에 실패했습니다.')
        if (data.details) {
          console.error('Error details:', data.details)
          alert(`평가계획 생성 실패: ${data.details}`)
        }
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleSmartPasteSuccess = (analyzedData: EvaluationPlan) => {
    setEvaluations([analyzedData, ...evaluations])
    setSmartPasteOpen(false)
  }

  const handleEditEvaluation = (evaluation: EvaluationPlan) => {
    setSelectedEvaluation(evaluation)
    setEditModalOpen(true)
  }

  const handleUpdateEvaluation = async (evaluationData: Partial<EvaluationPlan>) => {
    if (!evaluationData.id) return

    try {
      const response = await fetch(`/api/evaluations/${evaluationData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData),
      })

      const data = await response.json()

      if (data.success) {
        // 목록에서 해당 평가계획 업데이트
        setEvaluations(prev => 
          prev.map(evaluation => 
            evaluation.id === evaluationData.id ? { ...evaluation, ...data.data } : evaluation
          )
        )
        setEditModalOpen(false)
        setSelectedEvaluation(null)
      } else {
        throw new Error(data.error || '평가계획 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error updating evaluation:', error)
      throw error
    }
  }

  const handleGenerateSurvey = (evaluation: EvaluationPlan) => {
    setSelectedEvaluation(evaluation)
    setSurveyModalOpen(true)
  }

  const handleShareEvaluation = (evaluation: EvaluationPlan) => {
    setSelectedEvaluation(evaluation)
    setShareModalOpen(true)
  }

  const handleSurveySuccess = () => {
    // 설문이 성공적으로 생성되었음을 알림
    setSurveyModalOpen(false)
    setSelectedEvaluation(null)
    
    // TODO: 설문 목록 페이지로 이동하거나 성공 메시지 표시
    alert('자기평가 설문이 성공적으로 생성되었습니다!')
  }

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!confirm('정말로 이 평가계획을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setEvaluations(evaluations.filter(e => e.id !== evaluationId))
      } else {
        setError(data.error || '평가계획 삭제에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleBulkDeleteEvaluations = async (evaluationIds: string[]) => {
    try {
      const response = await fetch('/api/evaluations/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationIds }),
      })

      const data = await response.json()

      if (data.success) {
        setEvaluations(evaluations.filter(e => !evaluationIds.includes(e.id!)))
        alert(data.message)
      } else {
        setError(data.error || '평가계획 일괄 삭제에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  const handleSharedEvaluationCopySuccess = () => {
    // 공유된 평가계획을 복사했으므로 내 평가계획 목록을 새로고침
    fetchEvaluations()
    // 성공 메시지 표시
    alert('평가계획이 성공적으로 복사되었습니다! 내 평가계획 목록에서 확인하세요.')
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
          <h1 className="text-3xl font-bold text-gray-900">평가계획 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            평가계획을 등록하고 학생 자기평가 설문을 생성하세요.
          </p>
        </div>
        {activeTab === 'my' && (
          <div className="flex gap-2">
            <Button 
              onClick={() => setSharedEvaluationModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              공유 평가 찾기
            </Button>
            <Button 
              onClick={() => setSmartPasteOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              스마트 복사&붙여넣기
            </Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              새 평가계획
            </Button>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-2 inline" />
            내 평가계획
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shared'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Search className="h-4 w-4 mr-2 inline" />
            공유된 평가계획
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'my' ? (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {evaluations.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSmartPasteOpen(true)}>
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>스마트 복사&붙여넣기</CardTitle>
                  <CardDescription>
                    기존 평가계획서를 복사해서 붙여넣으면 AI가 자동으로 분석하여 구조화합니다.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCreateModalOpen(true)}>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>직접 입력</CardTitle>
                  <CardDescription>
                    템플릿을 사용하여 평가계획을 직접 입력합니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <EvaluationManager
              evaluations={evaluations}
              onDelete={handleDeleteEvaluation}
              onEdit={handleEditEvaluation}
              onGenerateSurvey={handleGenerateSurvey}
              onShare={handleShareEvaluation}
              onBulkDelete={handleBulkDeleteEvaluations}
            />
          )}
        </>
      ) : (
        <SharedEvaluationBrowser onCopySuccess={handleSharedEvaluationCopySuccess} />
      )}

      <CreateEvaluationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateEvaluation}
      />

      <EditEvaluationModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        evaluation={selectedEvaluation}
        onSave={handleUpdateEvaluation}
      />

      <SmartPasteModal
        open={smartPasteOpen}
        onOpenChange={setSmartPasteOpen}
        onSuccess={handleSmartPasteSuccess}
      />

      <GenerateSurveyModal
        open={surveyModalOpen}
        onOpenChange={setSurveyModalOpen}
        evaluationPlan={selectedEvaluation}
        onSuccess={handleSurveySuccess}
      />

      <ShareEvaluationModal
        evaluation={selectedEvaluation}
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false)
          setSelectedEvaluation(null)
        }}
      />

      <SharedEvaluationModal
        open={sharedEvaluationModalOpen}
        onOpenChange={setSharedEvaluationModalOpen}
        onCopySuccess={handleSharedEvaluationCopySuccess}
      />
    </div>
  )
}