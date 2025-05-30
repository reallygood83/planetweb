'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { Heart, Users, Handshake, UserCheck, Scale, Target, Shield, BookOpen, Sparkles } from 'lucide-react'

const CORE_VALUES = [
  { id: 'care', label: '배려', icon: Heart, description: '다른 사람을 생각하고 도움' },
  { id: 'sharing', label: '나눔', icon: Users, description: '함께 나누고 협력하는 마음' },
  { id: 'cooperation', label: '협력', icon: Handshake, description: '함께 일하고 도움을 주고받기' },
  { id: 'respect', label: '타인존중', icon: UserCheck, description: '다른 사람의 의견과 감정 존중' },
  { id: 'conflict', label: '갈등관리', icon: Scale, description: '문제 상황을 평화롭게 해결' },
  { id: 'relationship', label: '관계지향성', icon: Target, description: '좋은 관계 맺기와 유지' },
  { id: 'rules', label: '규칙준수', icon: Shield, description: '약속과 규칙을 잘 지키기' },
  { id: 'learning', label: '자기주도학습', icon: BookOpen, description: '스스로 계획하고 공부하기' }
]

export default function BehaviorSurveyPage() {
  const {} = useAuth()
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [observationContext, setObservationContext] = useState('')
  const [classActivities, setClassActivities] = useState('')
  const [specialEvents, setSpecialEvents] = useState('')
  const [grade, setGrade] = useState('')
  const [semester, setSemester] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSurvey, setGeneratedSurvey] = useState<any>(null)

  const handleValueToggle = (valueId: string) => {
    setSelectedValues(prev => 
      prev.includes(valueId) 
        ? prev.filter(id => id !== valueId)
        : [...prev, valueId]
    )
  }

  const handleGenerate = async () => {
    if (selectedValues.length === 0) {
      alert('평가하고 싶은 핵심 인성 요소를 1개 이상 선택해주세요.')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/surveys/generate-behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedValues,
          observationContext,
          classActivities,
          specialEvents,
          grade,
          semester
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedSurvey(data.data)
      } else {
        alert('설문 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error generating behavior survey:', error)
      alert('설문 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedSurvey) return

    try {
      const surveyData = {
        title: generatedSurvey.title,
        description: generatedSurvey.description,
        questions: generatedSurvey.questions,
        survey_type: 'behavior_development',
        behavior_criteria: {
          selectedValues,
          observationContext,
          classActivities,
          specialEvents,
          grade,
          semester
        }
      }

      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData)
      })

      const data = await response.json()

      if (data.success) {
        alert('행동발달사항 설문이 저장되었습니다!')
        window.location.href = '/dashboard/surveys'
      } else if (data.useLocalStorage && data.error === 'DATABASE_NOT_CONFIGURED') {
        // 데이터베이스가 설정되지 않은 경우 로컬 저장소에 저장
        console.log('Saving behavior survey to localStorage due to database not configured')
        
        const savedSurveys = JSON.parse(localStorage.getItem('saved_surveys') || '[]')
        const newSurvey = {
          id: `local-${Date.now()}`,
          ...surveyData,
          created_at: new Date().toISOString()
        }
        
        savedSurveys.push(newSurvey)
        localStorage.setItem('saved_surveys', JSON.stringify(savedSurveys))
        
        alert('데이터베이스가 설정되지 않아 행동발달사항 설문이 브라우저에 임시 저장되었습니다.\n실제 서비스 이용을 위해서는 데이터베이스 설정이 필요합니다.')
        window.location.href = '/dashboard/surveys'
      } else {
        const errorMessage = data.message || data.error || '알 수 없는 오류'
        alert('설문 저장에 실패했습니다: ' + errorMessage)
        console.error('Survey save error:', data)
      }
    } catch (error) {
      console.error('Error saving survey:', error)
      alert('설문 저장 중 네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">행동발달사항 자기평가 설문 생성</h1>
        <p className="text-gray-600">
          NEIS 행동특성 및 종합의견 작성을 위한 학생 자기평가 설문을 생성합니다.
          <br />
          핵심 인성 요소를 선택하고 관찰 맥락을 입력하면 맞춤형 질문을 생성합니다.
        </p>
        
        {/* Navigation */}
        <div className="flex gap-4 mt-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard/generate'}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            교과학습 설문 생성
          </Button>
          <Button 
            variant="default"
            onClick={() => window.location.href = '/dashboard/generate/behavior'}
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            행동발달사항 설문 생성
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade">학년</Label>
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="1학년">1학년</option>
                    <option value="2학년">2학년</option>
                    <option value="3학년">3학년</option>
                    <option value="4학년">4학년</option>
                    <option value="5학년">5학년</option>
                    <option value="6학년">6학년</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="semester">학기</Label>
                  <select
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="1학기">1학기</option>
                    <option value="2학기">2학기</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Values Selection */}
          <Card>
            <CardHeader>
              <CardTitle>핵심 인성 요소 선택</CardTitle>
              <CardDescription>
                평가하고 싶은 인성 요소를 선택하세요. (복수 선택 가능)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {CORE_VALUES.map((value) => {
                  const Icon = value.icon
                  return (
                    <div
                      key={value.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedValues.includes(value.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleValueToggle(value.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedValues.includes(value.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{value.label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{value.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Context Information */}
          <Card>
            <CardHeader>
              <CardTitle>관찰 맥락 정보</CardTitle>
              <CardDescription>
                구체적이고 의미있는 질문 생성을 위해 학급 상황을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="observation">주요 관찰 상황</Label>
                <Textarea
                  id="observation"
                  value={observationContext}
                  onChange={(e) => setObservationContext(e.target.value)}
                  placeholder="예: 모둠 활동, 발표 수업, 친구 갈등 상황, 교실 청소 등"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="activities">주요 학급 활동</Label>
                <Textarea
                  id="activities"
                  value={classActivities}
                  onChange={(e) => setClassActivities(e.target.value)}
                  placeholder="예: 체육대회, 학예회, 현장학습, 봉사활동, 프로젝트 수업 등"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="events">특별한 사건이나 프로그램</Label>
                <Textarea
                  id="events"
                  value={specialEvents}
                  onChange={(e) => setSpecialEvents(e.target.value)}
                  placeholder="예: 또래상담 활동, 학급회의, 리더십 활동, 멘토링 등"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>


          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || selectedValues.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                행동발달사항 설문 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                행동발달사항 설문 생성하기
              </>
            )}
          </Button>
        </div>

        {/* Generated Survey Preview */}
        <Card>
          <CardHeader>
            <CardTitle>생성된 설문 미리보기</CardTitle>
            <CardDescription>
              학생들이 답변할 자기평가 설문이 생성됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!generatedSurvey ? (
              <div className="text-center py-8 text-gray-500">
                <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>핵심 인성 요소를 선택하고</p>
                <p>&apos;설문 생성하기&apos;를 클릭하세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{generatedSurvey.title}</h3>
                  <p className="text-gray-600 mb-4">{generatedSurvey.description}</p>
                  
                  {/* Selected Values Display */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedValues.map(valueId => {
                      const value = CORE_VALUES.find(v => v.id === valueId)
                      return value ? (
                        <Badge key={valueId} variant="outline" className="flex items-center gap-1">
                          <value.icon className="h-3 w-3" />
                          {value.label}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {generatedSurvey.questions?.map((question: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge variant="outline">
                          {question.type === 'multiple_choice' ? '객관식' : '주관식'}
                        </Badge>
                        <span className="text-sm font-medium">Q{index + 1}</span>
                        {question.coreValue && (
                          <Badge variant="secondary" className="text-xs">
                            {CORE_VALUES.find(v => v.id === question.coreValue)?.label}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium mb-2">{question.question}</p>
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-1">
                          {question.options.map((option: string, optIndex: number) => (
                            <div key={optIndex} className="text-sm text-gray-600">
                              {optIndex + 1}. {option}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.guideline && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          <strong>답변 가이드:</strong> {question.guideline}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setGeneratedSurvey(null)}
                    className="flex-1"
                  >
                    다시 생성
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="flex-1"
                  >
                    설문 저장
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}