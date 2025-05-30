'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ArrowRight, FileText, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface ClassCreatedGuideProps {
  className: string
  studentCount: number
  onDismiss: () => void
}

export function ClassCreatedGuide({ className, studentCount, onDismiss }: ClassCreatedGuideProps) {
  const nextSteps = [
    {
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      title: "평가계획 등록",
      description: "교육과정에 맞는 평가계획을 등록하세요",
      href: "/dashboard/evaluation",
      priority: "high"
    },
    {
      icon: <Sparkles className="h-5 w-5 text-purple-600" />,
      title: "자기평가 설문 생성",
      description: "학생들이 응답할 자기평가 설문을 AI로 생성하세요",
      href: "/dashboard/evaluation",
      priority: "high"
    },
    {
      icon: <Users className="h-5 w-5 text-green-600" />,
      title: "학생 자기평가 수집",
      description: "학생들에게 설문 링크를 공유하고 응답을 수집하세요",
      href: "/dashboard/evaluation",
      priority: "medium"
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">학급이 성공적으로 생성되었습니다!</CardTitle>
          <CardDescription className="text-lg">
            <span className="font-semibold">{className}</span>에 {studentCount}명의 학생이 등록되었습니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">
              이제 다음 단계를 진행해보세요
            </h3>
            
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    {step.priority === 'high' && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2">
                        우선 단계
                      </span>
                    )}
                  </div>
                  <Link href={step.href}>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Planet의 특별한 점</h4>
            <p className="text-sm text-blue-800">
              Planet은 학생들의 자기평가를 바탕으로 개인 맞춤형 생활기록부를 작성합니다. 
              학생들의 목소리가 담긴 진정성 있는 기록을 만들어보세요!
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onDismiss} className="flex-1">
              나중에 하기
            </Button>
            <Link href="/dashboard/evaluation" className="flex-1">
              <Button className="w-full">
                평가계획 등록하기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}