'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { Trash2, Calendar, BookOpen, Sparkles, Target, Award, Edit, Share2 } from 'lucide-react'

interface EvaluationCardProps {
  evaluation: EvaluationPlan
  onDelete: (evaluationId: string) => void
  onEdit?: (evaluation: EvaluationPlan) => void
  onGenerateSurvey?: (evaluation: EvaluationPlan) => void
  onShare?: (evaluation: EvaluationPlan) => void
}

export function EvaluationCard({ 
  evaluation, 
  onDelete, 
  onEdit, 
  onGenerateSurvey, 
  onShare 
}: EvaluationCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {evaluation.subject}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {evaluation.grade} • {evaluation.semester}
              </span>
              <span className="text-purple-600 font-medium text-xs">
                {evaluation.school_year}년
              </span>
              <span className="text-blue-600 font-medium">
                {evaluation.unit}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(evaluation)}
                className="text-gray-600 hover:text-gray-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => evaluation.id && onDelete(evaluation.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* 성취기준 표시 */}
          {evaluation.achievement_standards && evaluation.achievement_standards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target className="h-4 w-4" />
                <span>성취기준 {evaluation.achievement_standards.length}개</span>
              </div>
              <div className="space-y-1">
                {evaluation.achievement_standards.slice(0, 2).map((standard, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                    {standard?.code && <span className="font-mono text-blue-700">{standard.code}</span>}
                    <span className="ml-2">
                      {(standard?.content || '').slice(0, 30)}...
                    </span>
                  </div>
                ))}
                {evaluation.achievement_standards.length > 2 && (
                  <div className="text-xs text-gray-500">
                    외 {evaluation.achievement_standards.length - 2}개...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 평가방법 표시 */}
          {evaluation.evaluation_methods && evaluation.evaluation_methods.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award className="h-4 w-4" />
                <span>평가방법</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {evaluation.evaluation_methods.slice(0, 3).map((method, index) => (
                  <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {method}
                  </span>
                ))}
                {evaluation.evaluation_methods.length > 3 && (
                  <span className="text-xs text-gray-500">+{evaluation.evaluation_methods.length - 3}</span>
                )}
              </div>
            </div>
          )}

          {/* AI 생성 대상 */}
          {evaluation.ai_generation_targets && evaluation.ai_generation_targets.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">AI 생성 대상:</div>
              <div className="flex flex-wrap gap-1">
                {evaluation.ai_generation_targets.map((target, index) => (
                  <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              생성일: {formatDate(evaluation.created_at)}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 flex items-center gap-1"
              onClick={() => onGenerateSurvey?.(evaluation)}
              disabled={!onGenerateSurvey}
            >
              <Sparkles className="h-3 w-3" />
              설문 생성
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 flex items-center gap-1"
              onClick={() => onShare?.(evaluation)}
              disabled={!onShare}
            >
              <Share2 className="h-3 w-3" />
              공유
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}