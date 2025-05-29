'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EvaluationPlan } from '@/types'
import { Trash2, FileText, Calendar, BookOpen } from 'lucide-react'

interface EvaluationListProps {
  evaluations: EvaluationPlan[]
  onDelete: (evaluationId: string) => void
}

export function EvaluationList({ evaluations, onDelete }: EvaluationListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {evaluations.map((evaluation) => (
        <Card key={evaluation.id} className="hover:shadow-lg transition-shadow">
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
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => evaluation.id && onDelete(evaluation.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>평가 {evaluation.evaluations.length}개</span>
              </div>
              
              {evaluation.evaluations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">평가 목록:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {evaluation.evaluations.slice(0, 3).map((evaluationItem, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {evaluationItem.evaluationName}
                        {evaluationItem.unitName && ` (${evaluationItem.unitName})`}
                      </div>
                    ))}
                    {evaluation.evaluations.length > 3 && (
                      <div className="text-xs text-gray-500">
                        외 {evaluation.evaluations.length - 3}개...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  생성일: {formatDate(evaluation.created_at || evaluation.createdAt || '')}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  설문 생성
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  편집
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}