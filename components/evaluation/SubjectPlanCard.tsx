'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubjectEvaluationPlan, IndividualEvaluation } from '@/lib/types/evaluation-v2'
import { BookOpen, Plus, ChevronDown, ChevronUp, Calendar, Target, Award, Edit2, Trash2 } from 'lucide-react'

interface SubjectPlanCardProps {
  plan: SubjectEvaluationPlan & { evaluations?: IndividualEvaluation[] }
  onAddEvaluation: (planId: string) => void
  onEditEvaluation?: (evaluation: IndividualEvaluation) => void
  onDeleteEvaluation?: (evaluationId: string) => void
  onDeletePlan?: (planId: string) => void
}

export function SubjectPlanCard({ 
  plan, 
  onAddEvaluation,
  onEditEvaluation,
  onDeleteEvaluation,
  onDeletePlan
}: SubjectPlanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const evaluationCount = plan.evaluations?.length || 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {plan.subject}
            </CardTitle>
            <CardDescription className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {plan.school_year}학년도
              </span>
              <Badge variant="secondary">
                {plan.grade} • {plan.semester}
              </Badge>
              <Badge variant="outline">
                평가 {evaluationCount}개
              </Badge>
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddEvaluation(plan.id)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              평가 추가
            </Button>
            
            {evaluationCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            
            {onDeletePlan && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeletePlan(plan.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {expanded && plan.evaluations && plan.evaluations.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {plan.evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{evaluation.evaluation_name}</h4>
                    <p className="text-sm text-gray-600">
                      {evaluation.unit} {evaluation.lesson && `• ${evaluation.lesson}`}
                      {evaluation.evaluation_period && ` • ${evaluation.evaluation_period}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {evaluation.weight && evaluation.weight !== 100 && (
                      <Badge variant="secondary" className="text-xs">
                        {evaluation.weight}%
                      </Badge>
                    )}
                    {onEditEvaluation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditEvaluation(evaluation)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteEvaluation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteEvaluation(evaluation.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 성취기준 */}
                {evaluation.achievement_standards && evaluation.achievement_standards.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <Target className="h-3 w-3" />
                      <span>성취기준</span>
                    </div>
                    <div className="space-y-1">
                      {evaluation.achievement_standards.map((standard, idx) => (
                        <div key={idx} className="text-xs bg-white px-2 py-1 rounded">
                          <span className="font-mono text-blue-700">{standard.code}</span>
                          <span className="ml-2">{standard.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 평가방법 */}
                <div className="flex flex-wrap gap-1">
                  <Award className="h-3 w-3 text-gray-600" />
                  {evaluation.evaluation_methods.map((method, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}