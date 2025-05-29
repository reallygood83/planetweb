'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { Sparkles, FileText, Users, BookOpen, Target } from 'lucide-react'

export default function GeneratePage() {
  const {} = useAuth()
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [semester, setSemester] = useState('')
  const [unit, setUnit] = useState('')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [achievementStandards, setAchievementStandards] = useState('')
  const [evaluationCriteria, setEvaluationCriteria] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSurvey, setGeneratedSurvey] = useState<any>(null)

  const handleGenerate = async () => {
    console.log('Generating survey with data:', {
      subject,
      grade,
      semester,
      unit,
      learningObjectives,
      achievementStandards,
      evaluationCriteria
    })
    
    setIsGenerating(true)
    
    try {
      const requestBody = {
        subject,
        grade,
        semester,
        unit,
        learningObjectives,
        achievementStandards,
        evaluationCriteria
      }
      
      console.log('Request body:', requestBody)
      
      const response = await fetch('/api/surveys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        setGeneratedSurvey(data.data)
      } else {
        const errorMessage = data.error || '알 수 없는 오류'
        const details = data.details ? '\n\n세부 정보:\n' + JSON.stringify(data.details, null, 2) : ''
        alert('설문 생성에 실패했습니다: ' + errorMessage + details)
      }
    } catch (error) {
      console.error('Error generating survey:', error)
      alert('설문 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedSurvey) return

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedSurvey.title,
          description: generatedSurvey.description,
          questions: generatedSurvey.questions,
          evaluation_plan: {
            subject,
            grade,
            semester,
            unit,
            learningObjectives,
            achievementStandards,
            evaluationCriteria
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('설문이 저장되었습니다!')
        setGeneratedSurvey(null)
        // Reset form
        setSubject('')
        setGrade('')
        setSemester('')
        setUnit('')
        setLearningObjectives('')
        setAchievementStandards('')
        setEvaluationCriteria('')
      } else {
        alert('설문 저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Error saving survey:', error)
      alert('설문 저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI 자기평가 설문 생성</h1>
        <p className="text-gray-600">평가계획 정보를 입력하면 AI가 학생 자기평가용 설문을 자동으로 생성합니다.</p>
        
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
            variant="outline"
            onClick={() => window.location.href = '/dashboard/generate/behavior'}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            행동발달사항 설문 생성
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              평가계획 입력
            </CardTitle>
            <CardDescription>
              생성할 설문의 기반이 될 평가계획 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">교과목</Label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 수학"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="unit">단원</Label>
                <input
                  id="unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="예: 분수의 덧셈과 뺄셈"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="objectives">학습목표</Label>
              <Textarea
                id="objectives"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="이 단원에서 학생들이 달성해야 할 학습목표를 입력하세요"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="standards">성취기준</Label>
              <Textarea
                id="standards"
                value={achievementStandards}
                onChange={(e) => setAchievementStandards(e.target.value)}
                placeholder="교육과정의 성취기준을 입력하세요"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="criteria">평가기준</Label>
              <Textarea
                id="criteria"
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                placeholder="학생들을 평가할 기준을 입력하세요"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !subject || !grade || !unit}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  설문 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 설문 생성하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Survey Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              생성된 설문 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!generatedSurvey ? (
              <div className="text-center py-8 text-gray-500">
                평가계획을 입력하고 &apos;설문 생성하기&apos;를 클릭하세요.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{generatedSurvey.title}</h3>
                  <p className="text-gray-600 mb-4">{generatedSurvey.description}</p>
                </div>

                <div className="space-y-3">
                  {generatedSurvey.questions?.map((question: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge variant="outline">
                          {question.type === 'multiple_choice' ? '객관식' : '주관식'}
                        </Badge>
                        <span className="text-sm font-medium">Q{index + 1}</span>
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