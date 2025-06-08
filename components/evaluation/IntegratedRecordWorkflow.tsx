'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'current' | 'error';
  required: boolean;
  dataSource?: string;
}

interface StudentRecordData {
  student_name: string;
  evaluation_plan?: any;
  survey_response?: any;
  teacher_evaluation?: any;
  observation_records?: any[];
  generated_content?: string;
}

export default function IntegratedRecordWorkflow({
  studentName,
  evaluationPlanId,
  onComplete
}: {
  studentName: string;
  evaluationPlanId: string;
  onComplete?: (data: StudentRecordData) => void;
}) {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'evaluation_plan',
      title: '평가계획 확인',
      description: '교육과정 기반 평가계획이 설정되었습니다',
      status: 'pending',
      required: true,
      dataSource: 'evaluation_plans'
    },
    {
      id: 'teacher_evaluation',
      title: '교사 평가 (성취수준)',
      description: '학생의 성취수준을 평가해주세요',
      status: 'pending',
      required: true,
      dataSource: 'teacher_evaluations'
    },
    {
      id: 'student_survey',
      title: '학생 자기평가',
      description: '학생이 설문에 응답했는지 확인',
      status: 'pending',
      required: true,
      dataSource: 'survey_responses'
    },
    {
      id: 'observation_records',
      title: '교사 관찰 기록',
      description: '일상 관찰 기록 추가 (선택사항)',
      status: 'pending',
      required: false,
      dataSource: 'daily_observations'
    },
    {
      id: 'generate_record',
      title: '생기부 생성',
      description: '모든 데이터를 종합하여 생기부 생성',
      status: 'pending',
      required: true,
      dataSource: 'generated_contents'
    }
  ]);

  const [studentData, setStudentData] = useState<StudentRecordData>({
    student_name: studentName
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 초기 데이터 로드
  useEffect(() => {
    checkDataAvailability();
  }, [studentName, evaluationPlanId, checkDataAvailability]);

  const checkDataAvailability = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // 1. 평가계획 확인
      const evalPlanResponse = await fetch(`/api/evaluations/${evaluationPlanId}`);
      if (evalPlanResponse.ok) {
        const evalPlan = await evalPlanResponse.json();
        updateStepStatus('evaluation_plan', 'completed');
        setStudentData(prev => ({ ...prev, evaluation_plan: evalPlan }));
      }

      // 2. 교사 평가 확인
      const teacherEvalResponse = await fetch(
        `/api/teacher-evaluations/save?evaluation_plan_id=${evaluationPlanId}&student_name=${studentName}`
      );
      if (teacherEvalResponse.ok) {
        const teacherEval = await teacherEvalResponse.json();
        if (teacherEval.evaluations?.length > 0) {
          updateStepStatus('teacher_evaluation', 'completed');
          setStudentData(prev => ({ ...prev, teacher_evaluation: teacherEval.evaluations[0] }));
        }
      }

      // 3. 학생 설문 응답 확인
      const surveyResponse = await fetch(
        `/api/teacher/responses?evaluation_plan_id=${evaluationPlanId}&student_name=${studentName}`
      );
      if (surveyResponse.ok) {
        const surveys = await surveyResponse.json();
        if (surveys.responses?.length > 0) {
          updateStepStatus('student_survey', 'completed');
          setStudentData(prev => ({ ...prev, survey_response: surveys.responses[0] }));
        }
      }

      // 4. 관찰 기록 확인 (선택사항)
      const observationResponse = await fetch(
        `/api/observations/daily?student_name=${studentName}&days=30`
      );
      if (observationResponse.ok) {
        const observations = await observationResponse.json();
        if (observations.records?.length > 0) {
          updateStepStatus('observation_records', 'completed');
          setStudentData(prev => ({ ...prev, observation_records: observations.records }));
        }
      }

      // 현재 단계 설정
      updateCurrentStep();
      
    } catch (error) {
      console.error('데이터 확인 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [evaluationPlanId, studentName]);

  const updateStepStatus = (stepId: string, status: WorkflowStep['status']) => {
    setWorkflowSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const updateCurrentStep = () => {
    const firstPendingRequired = workflowSteps.findIndex(
      step => step.status === 'pending' && step.required
    );
    
    if (firstPendingRequired !== -1) {
      setCurrentStep(firstPendingRequired);
      updateStepStatus(workflowSteps[firstPendingRequired].id, 'current');
    }
  };

  const handleStepAction = async (step: WorkflowStep) => {
    switch (step.id) {
      case 'teacher_evaluation':
        // 교사 평가 페이지로 이동 또는 모달 열기
        window.open(`/dashboard/teacher-evaluation?student=${studentName}&plan=${evaluationPlanId}`, '_blank');
        break;
        
      case 'student_survey':
        // 설문 상태 확인
        alert('학생에게 설문 링크를 전달해주세요.');
        break;
        
      case 'observation_records':
        // 관찰 기록 페이지로 이동
        window.open('/dashboard/observation-records', '_blank');
        break;
        
      case 'generate_record':
        // 생기부 생성
        await generateStudentRecord();
        break;
    }
  };

  const generateStudentRecord = async () => {
    if (!studentData.survey_response) {
      alert('학생 자기평가가 필요합니다.');
      return;
    }

    setIsLoading(true);
    updateStepStatus('generate_record', 'current');

    try {
      const response = await fetch('/api/records/generate-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: studentData.survey_response.id,
          apiKey: localStorage.getItem('gemini_api_key'), // 암호화된 키 처리 필요
          recordType: '교과학습발달상황',
          useEnhancedPrompt: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        updateStepStatus('generate_record', 'completed');
        setStudentData(prev => ({ 
          ...prev, 
          generated_content: result.generated_content 
        }));
        
        if (onComplete) {
          onComplete({ ...studentData, generated_content: result.generated_content });
        }
      } else {
        updateStepStatus('generate_record', 'error');
        const error = await response.json();
        alert(`생성 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('생기부 생성 오류:', error);
      updateStepStatus('generate_record', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = () => {
    const completed = workflowSteps.filter(step => step.status === 'completed').length;
    return (completed / workflowSteps.length) * 100;
  };

  const canGenerate = () => {
    const requiredSteps = workflowSteps.filter(step => step.required && step.id !== 'generate_record');
    return requiredSteps.every(step => step.status === 'completed');
  };

  return (
    <Card className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">
          {studentName} - 생기부 작성 워크플로우
        </h3>
        <div className="flex items-center space-x-4">
          <Progress value={getProgress()} className="flex-1" />
          <span className="text-sm text-gray-600">
            {Math.round(getProgress())}% 완료
          </span>
        </div>
      </div>

      {/* 데이터 소스 상태 */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            studentData.evaluation_plan ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span>평가계획</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            studentData.teacher_evaluation ? 'bg-green-500' : 'bg-orange-500'
          }`} />
          <span>교사 평가</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            studentData.survey_response ? 'bg-green-500' : 'bg-orange-500'
          }`} />
          <span>학생 자기평가</span>
        </div>
      </div>

      {/* 워크플로우 단계 */}
      <div className="space-y-3">
        {workflowSteps.map((step, index) => (
          <div
            key={step.id}
            className={`
              flex items-center justify-between p-4 rounded-lg border
              ${step.status === 'current' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              ${step.status === 'completed' ? 'bg-green-50' : ''}
              ${step.status === 'error' ? 'bg-red-50 border-red-300' : ''}
            `}
          >
            <div className="flex items-center space-x-3">
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : step.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              
              <div>
                <div className="font-medium">
                  {step.title}
                  {!step.required && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      선택
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>

            {step.status === 'current' && (
              <Button
                size="sm"
                onClick={() => handleStepAction(step)}
                disabled={isLoading}
              >
                {step.id === 'generate_record' ? '생성하기' : '진행하기'}
              </Button>
            )}

            {step.status === 'pending' && index > currentStep && (
              <span className="text-sm text-gray-500">대기중</span>
            )}
          </div>
        ))}
      </div>

      {/* 생성 버튼 */}
      {canGenerate() && workflowSteps[workflowSteps.length - 1].status === 'pending' && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => handleStepAction(workflowSteps[workflowSteps.length - 1])}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            모든 데이터로 생기부 생성
          </Button>
        </div>
      )}

      {/* 생성 결과 */}
      {studentData.generated_content && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">생성된 교과학습발달상황</h4>
          <p className="text-sm whitespace-pre-wrap">{studentData.generated_content}</p>
          <div className="mt-3 flex justify-end space-x-2">
            <Button variant="outline" size="sm">
              수정하기
            </Button>
            <Button size="sm">
              저장하기
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}