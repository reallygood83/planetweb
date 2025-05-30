'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle } from 'lucide-react';

interface SurveyInfo {
  survey: {
    id: string;
    title: string;
    description: string;
    questions: any[];
    teacherName: string;
  };
  class: {
    name: string;
    grade: number;
    class_number: number;
  } | null;
  remainingResponses: number | null;
}

export default function AnonymousSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const accessCode = params.code as string;
  
  const [surveyInfo, setSurveyInfo] = useState<SurveyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSurveyInfo();
  }, [accessCode]);

  const fetchSurveyInfo = async () => {
    try {
      const response = await fetch(`/api/share/survey?code=${accessCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설문을 불러올 수 없습니다.');
      }

      setSurveyInfo(data);
      
      // 응답 초기화
      const initialResponses: Record<string, any> = {};
      data.survey.questions.forEach((q: any) => {
        if (q.type === 'checkbox') {
          initialResponses[q.id] = [];
        } else {
          initialResponses[q.id] = '';
        }
      });
      setResponses(initialResponses);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    // 모든 필수 질문에 답변했는지 확인
    const unanswered = surveyInfo?.survey.questions.filter(q => 
      q.required && (!responses[q.id] || (Array.isArray(responses[q.id]) && responses[q.id].length === 0))
    );

    if (unanswered && unanswered.length > 0) {
      alert('모든 필수 질문에 답변해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/share/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          studentName,
          responses
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설문 제출에 실패했습니다.');
      }

      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '설문 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">설문을 불러오는 중...</p>
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">설문이 제출되었습니다!</h2>
            <p className="text-gray-600 mb-6">
              {studentName}님의 응답이 성공적으로 저장되었습니다.
            </p>
            <Button onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!surveyInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{surveyInfo.survey.title}</CardTitle>
            <CardDescription>
              {surveyInfo.survey.description}
              <div className="mt-2 text-sm">
                <p>담당 선생님: {surveyInfo.survey.teacherName}</p>
                {surveyInfo.class && (
                  <p>학급: {surveyInfo.class.grade}학년 {surveyInfo.class.class_number}반 {surveyInfo.class.name}</p>
                )}
                {surveyInfo.remainingResponses !== null && (
                  <p>남은 응답 가능 수: {surveyInfo.remainingResponses}명</p>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 학생 이름 입력 */}
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="실명을 입력해주세요"
                  required
                />
              </div>

              <div className="border-t pt-6">
                {/* 설문 질문들 */}
                {surveyInfo.survey.questions.map((question: any, index: number) => (
                  <div key={question.id} className="mb-6">
                    <Label className="text-base mb-2 block">
                      {index + 1}. {question.text}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {/* 단답형 */}
                    {question.type === 'text' && (
                      <Input
                        type="text"
                        value={responses[question.id] || ''}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        required={question.required}
                      />
                    )}

                    {/* 장문형 */}
                    {question.type === 'textarea' && (
                      <Textarea
                        value={responses[question.id] || ''}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        rows={4}
                        required={question.required}
                      />
                    )}

                    {/* 객관식 */}
                    {question.type === 'radio' && (
                      <RadioGroup
                        value={responses[question.id] || ''}
                        onValueChange={(value) => handleResponseChange(question.id, value)}
                      >
                        {question.options.map((option: string) => (
                          <div key={option} className="flex items-center space-x-2 mb-2">
                            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                            <Label htmlFor={`${question.id}-${option}`} className="font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {/* 복수 선택 */}
                    {question.type === 'checkbox' && (
                      <div>
                        {question.options.map((option: string) => (
                          <div key={option} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`${question.id}-${option}`}
                              checked={(responses[question.id] || []).includes(option)}
                              onCheckedChange={(checked) => {
                                const current = responses[question.id] || [];
                                if (checked) {
                                  handleResponseChange(question.id, [...current, option]);
                                } else {
                                  handleResponseChange(question.id, current.filter((v: string) => v !== option));
                                }
                              }}
                            />
                            <Label htmlFor={`${question.id}-${option}`} className="font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 척도형 */}
                    {question.type === 'scale' && (
                      <RadioGroup
                        value={responses[question.id] || ''}
                        onValueChange={(value) => handleResponseChange(question.id, value)}
                      >
                        <div className="flex justify-between">
                          {Array.from({ length: question.max - question.min + 1 }, (_, i) => {
                            const value = (question.min + i).toString();
                            return (
                              <div key={value} className="text-center">
                                <RadioGroupItem value={value} id={`${question.id}-${value}`} className="mx-auto" />
                                <Label htmlFor={`${question.id}-${value}`} className="block mt-1 text-sm">
                                  {value}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                          <span>{question.minLabel}</span>
                          <span>{question.maxLabel}</span>
                        </div>
                      </RadioGroup>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" disabled={submitting}>
                  {submitting ? '제출 중...' : '설문 제출하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}