'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Calendar, User } from 'lucide-react';

interface SharedEvaluation {
  evaluation: any;
  allowCopy: boolean;
  viewCount: number;
  sharedBy: string;
  expiresAt: string | null;
}

export default function SharedEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const shareCode = params.code as string;
  
  const [evaluation, setEvaluation] = useState<SharedEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSharedEvaluation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode]);

  const fetchSharedEvaluation = async () => {
    try {
      const response = await fetch(`/api/share/evaluation?code=${shareCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '평가계획을 불러올 수 없습니다.');
      }

      setEvaluation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!evaluation?.allowCopy) {
      alert('이 평가계획은 복사가 허용되지 않습니다.');
      return;
    }

    // TODO: 복사 기능 구현
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">평가계획을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">오류</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  const eval_plan = evaluation.evaluation;
  const expiresAt = evaluation.expiresAt ? new Date(evaluation.expiresAt) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 정보 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">공유된 평가계획</h1>
            {evaluation.allowCopy && (
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? '복사됨!' : '내 평가계획으로 복사'}
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>공유자: {evaluation.sharedBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>조회수: {evaluation.viewCount}회</span>
            </div>
            {expiresAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  만료일: {expiresAt.toLocaleDateString('ko-KR')}
                  {isExpired && <Badge variant="destructive" className="ml-2">만료됨</Badge>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 평가계획 내용 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {eval_plan.subject} - {eval_plan.grade}학년 {eval_plan.semester}
              </CardTitle>
              <Badge variant="outline">{eval_plan.unit || '전체'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 성취기준 */}
            {eval_plan.achievement_standards && (
              <div>
                <h3 className="font-semibold mb-2">성취기준</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {Array.isArray(eval_plan.achievement_standards) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {eval_plan.achievement_standards.map((standard: string, idx: number) => (
                        <li key={idx}>{standard}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-wrap">{eval_plan.achievement_standards}</p>
                  )}
                </div>
              </div>
            )}

            {/* 학습목표 */}
            {eval_plan.learning_objectives && (
              <div>
                <h3 className="font-semibold mb-2">학습목표</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {Array.isArray(eval_plan.learning_objectives) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {eval_plan.learning_objectives.map((objective: string, idx: number) => (
                        <li key={idx}>{objective}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-wrap">{eval_plan.learning_objectives}</p>
                  )}
                </div>
              </div>
            )}

            {/* 평가 기준 */}
            {eval_plan.evaluation_criteria && (
              <div>
                <h3 className="font-semibold mb-2">평가 기준</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">
                    {typeof eval_plan.evaluation_criteria === 'string' 
                      ? eval_plan.evaluation_criteria 
                      : JSON.stringify(eval_plan.evaluation_criteria, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* 평가 방법 */}
            {eval_plan.evaluation_methods && (
              <div>
                <h3 className="font-semibold mb-2">평가 방법</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {Array.isArray(eval_plan.evaluation_methods) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {eval_plan.evaluation_methods.map((method: string, idx: number) => (
                        <li key={idx}>{method}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-wrap">{eval_plan.evaluation_methods}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 하단 안내 */}
        {evaluation.allowCopy && !isExpired && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              이 평가계획이 도움이 되셨나요? 
              <br />
              로그인하시면 내 평가계획으로 복사하여 활용하실 수 있습니다.
            </p>
            <Button onClick={() => router.push('/auth/login')}>
              로그인하고 복사하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}