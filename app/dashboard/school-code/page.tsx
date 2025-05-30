'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'

export default function SchoolCodePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">학교 코드 관리</h1>
        <p className="mt-2 text-sm text-gray-600">
          학교 코드 시스템이 새로운 공유 시스템으로 개선되었습니다.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-900">시스템 업데이트 안내</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-amber-800">
            기존의 복잡한 학교 코드 시스템이 더 간편한 공유 시스템으로 개선되었습니다.
            이제 각 기능별로 직접 공유할 수 있습니다.
          </CardDescription>

          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">📚 평가계획 공유</h3>
              <p className="text-sm text-gray-600 mb-3">
                평가계획을 6자리 코드로 다른 선생님들과 공유할 수 있습니다.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/dashboard/evaluation')}
                className="flex items-center gap-2"
              >
                평가계획 관리로 이동
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 bg-white rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">📝 설문 공유</h3>
              <p className="text-sm text-gray-600 mb-3">
                학생들이 6자리 코드로 설문에 참여할 수 있습니다. 
                로그인 없이 번호와 이름만 입력하면 됩니다.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/dashboard/surveys')}
                className="flex items-center gap-2"
              >
                설문 관리로 이동
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-amber-200">
            <h4 className="font-medium text-amber-900 mb-2">주요 개선사항:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>복잡한 그룹 관리 제거</li>
              <li>간단한 6자리 코드로 즉시 공유</li>
              <li>학생들의 편리한 설문 참여</li>
              <li>평가계획별 개별 공유 가능</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}