'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AchievementLevelInput from '@/components/evaluation/AchievementLevelInput';
import { StudentAchievement, AchievementLevel } from '@/lib/types/teacher-evaluation';

interface Class {
  id: string;
  class_name: string;
  students: any[];
}

interface EvaluationPlan {
  id: string;
  subject: string;
  grade: string;
  semester: string;
  unit: string;
}

export default function TeacherEvaluationPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [evaluationPlans, setEvaluationPlans] = useState<EvaluationPlan[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<EvaluationPlan | null>(null);
  const [evaluationName, setEvaluationName] = useState('');
  const [evaluationPeriod, setEvaluationPeriod] = useState('');
  const [studentAchievements, setStudentAchievements] = useState<Record<string, StudentAchievement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  // 초기 데이터 로드
  useEffect(() => {
    fetchClasses();
    fetchEvaluationPlans();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('학급 조회 오류:', error);
    }
  };

  const fetchEvaluationPlans = async () => {
    try {
      const response = await fetch('/api/evaluations');
      if (response.ok) {
        const data = await response.json();
        setEvaluationPlans(data.plans || []);
      }
    } catch (error) {
      console.error('평가계획 조회 오류:', error);
    }
  };

  // 학생 이름 목록 가져오기
  const getStudentNames = (): { name: string; number?: number }[] => {
    if (!selectedClass) return [];
    
    if (Array.isArray(selectedClass.students)) {
      return selectedClass.students.map((student, index) => {
        if (typeof student === 'string') {
          return { name: student, number: index + 1 };
        } else if (student.name || student.student_name) {
          return { 
            name: student.name || student.student_name, 
            number: student.number || student.student_number || index + 1 
          };
        }
        return { name: '', number: index + 1 };
      }).filter(s => s.name);
    }
    
    return [];
  };

  const students = getStudentNames();
  const currentStudent = students[currentStudentIndex];

  // 학생별 성취수준 업데이트
  const handleAchievementChange = (studentName: string, achievement: StudentAchievement) => {
    setStudentAchievements(prev => ({
      ...prev,
      [studentName]: achievement
    }));
  };

  // 평가 저장
  const handleSaveEvaluation = async () => {
    if (!selectedClass || !selectedPlan || Object.keys(studentAchievements).length === 0) {
      alert('평가계획과 학급을 선택하고 최소 한 명의 학생을 평가해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/teacher-evaluations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluation_plan_id: selectedPlan.id,
          class_id: selectedClass.id,
          evaluation_name: evaluationName || `${selectedPlan.subject} ${selectedPlan.unit} 평가`,
          evaluation_period: evaluationPeriod,
          student_achievements: Object.values(studentAchievements)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`성취수준 평가가 저장되었습니다. (${result.saved_count}명)`);
        
        // 저장 후 초기화
        setStudentAchievements({});
        setCurrentStudentIndex(0);
      } else {
        const error = await response.json();
        alert(`저장 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 통계 계산
  const getStatistics = () => {
    const achievements = Object.values(studentAchievements);
    const total = achievements.length;
    
    const distribution: Record<AchievementLevel, number> = {
      '매우잘함': 0,
      '잘함': 0,
      '보통': 0,
      '노력요함': 0
    };

    achievements.forEach(a => {
      distribution[a.achievement_level]++;
    });

    return { total, distribution };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">교사 평가 - 성취수준 입력</h1>
              <p className="text-gray-600 mt-2">
                평가계획에 따른 학생별 성취수준을 입력하여 생기부 작성의 근거 자료로 활용하세요
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant={viewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('single')}
              >
                개별 입력
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                전체 보기
              </Button>
            </div>
          </div>

          {/* 평가 정보 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="evaluation-plan">평가계획 선택</Label>
              <select
                id="evaluation-plan"
                value={selectedPlan?.id || ''}
                onChange={(e) => {
                  const plan = evaluationPlans.find(p => p.id === e.target.value);
                  setSelectedPlan(plan || null);
                }}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
              >
                <option value="">평가계획을 선택하세요</option>
                {evaluationPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.subject} - {plan.unit} ({plan.grade} {plan.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="class-select">학급 선택</Label>
              <select
                id="class-select"
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const cls = classes.find(c => c.id === e.target.value);
                  setSelectedClass(cls || null);
                  setCurrentStudentIndex(0);
                  setStudentAchievements({});
                }}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
              >
                <option value="">학급을 선택하세요</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="evaluation-name">평가명</Label>
              <Input
                id="evaluation-name"
                placeholder="예: 1학기 중간평가"
                value={evaluationName}
                onChange={(e) => setEvaluationName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="evaluation-period">평가 시기</Label>
              <Input
                id="evaluation-period"
                placeholder="예: 2024년 1학기 중간"
                value={evaluationPeriod}
                onChange={(e) => setEvaluationPeriod(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 평가 현황 */}
          {selectedClass && selectedPlan && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-sm">
                  <span className="text-gray-600">평가 진행:</span>
                  <span className="ml-2 font-semibold">
                    {stats.total}/{students.length}명
                  </span>
                </div>
                
                <div className="flex space-x-3">
                  {Object.entries(stats.distribution).map(([level, count]) => (
                    <Badge key={level} variant="secondary">
                      {level}: {count}명
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleSaveEvaluation}
                disabled={isSaving || stats.total === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? '저장 중...' : '평가 저장'}
              </Button>
            </div>
          )}
        </div>

        {/* 학생 평가 입력 영역 */}
        {selectedClass && selectedPlan && (
          <div className="space-y-6">
            {viewMode === 'single' ? (
              // 개별 학생 입력 모드
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    학생 평가 ({currentStudentIndex + 1}/{students.length})
                  </h2>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStudentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentStudentIndex === 0}
                    >
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStudentIndex(prev => 
                        Math.min(students.length - 1, prev + 1)
                      )}
                      disabled={currentStudentIndex === students.length - 1}
                    >
                      다음
                    </Button>
                  </div>
                </div>

                {currentStudent && (
                  <AchievementLevelInput
                    studentName={currentStudent.name}
                    studentNumber={currentStudent.number}
                    evaluationAreas={['듣기·말하기', '읽기', '쓰기', '문법·문학']} // 교과별로 다르게 설정
                    onAchievementChange={(achievement) => 
                      handleAchievementChange(currentStudent.name, achievement)
                    }
                    initialData={studentAchievements[currentStudent.name]}
                  />
                )}
              </Card>
            ) : (
              // 전체 학생 그리드 모드
              <div className="grid grid-cols-1 gap-6">
                {students.map(student => (
                  <AchievementLevelInput
                    key={student.name}
                    studentName={student.name}
                    studentNumber={student.number}
                    evaluationAreas={['듣기·말하기', '읽기', '쓰기', '문법·문학']}
                    onAchievementChange={(achievement) => 
                      handleAchievementChange(student.name, achievement)
                    }
                    initialData={studentAchievements[student.name]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        {(!selectedClass || !selectedPlan) && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">성취수준 평가 시작하기</h3>
              <p className="text-gray-600">
                평가계획과 학급을 선택한 후,<br />
                각 학생의 성취수준을 입력하여<br />
                체계적인 평가 자료를 구축하세요.
              </p>
              <div className="pt-4 text-sm text-gray-500">
                <p>💡 평가 데이터는 생기부 작성 시 자동으로 반영됩니다.</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}