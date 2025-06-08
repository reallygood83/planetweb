'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import KeywordCheckboxSystem from '@/components/observation/KeywordCheckboxSystem';
import { StudentObservation } from '@/lib/types/observation-system';

interface Class {
  id: string;
  class_name: string;
  students: any[];
}

export default function ObservationRecordsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [studentObservations, setStudentObservations] = useState<Record<string, StudentObservation>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // 학급 목록 조회
  useEffect(() => {
    fetchClasses();
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

  // 학급 선택 시 학생 목록 초기화
  const handleClassSelect = (classData: Class) => {
    setSelectedClass(classData);
    setCurrentStudentIndex(0);
    setStudentObservations({});
  };

  // 학생별 관찰 기록 업데이트
  const handleObservationChange = (studentName: string, observation: StudentObservation) => {
    setStudentObservations(prev => ({
      ...prev,
      [studentName]: observation
    }));
  };

  // 관찰 세션 저장
  const handleSaveSession = async () => {
    if (!selectedClass || Object.keys(studentObservations).length === 0) {
      alert('학급을 선택하고 최소 한 명의 학생에 대한 관찰 기록을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const studentsObservations = Object.values(studentObservations).filter(
        obs => obs.selected_keywords.length > 0 || obs.additional_notes
      );

      const response = await fetch('/api/observations/save-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: selectedClass.id,
          session_date: sessionDate,
          subject,
          lesson_topic: lessonTopic,
          students_observations: studentsObservations
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`관찰 기록이 저장되었습니다. (${result.saved_observations}개 관찰 기록)`);
        
        // 저장 후 초기화
        setStudentObservations({});
        setSubject('');
        setLessonTopic('');
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

  // 다음 학생으로 이동
  const handleNextStudent = () => {
    if (selectedClass && currentStudentIndex < getStudentNames().length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  // 이전 학생으로 이동
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  // 학생 이름 목록 가져오기
  const getStudentNames = (): string[] => {
    if (!selectedClass) return [];
    
    if (Array.isArray(selectedClass.students)) {
      return selectedClass.students.map(student => 
        typeof student === 'string' ? student : student.name || student.student_name || ''
      ).filter(Boolean);
    }
    
    return [];
  };

  const studentNames = getStudentNames();
  const currentStudentName = studentNames[currentStudentIndex];

  // 진행률 계산
  const getProgress = () => {
    const totalStudents = studentNames.length;
    const recordedStudents = Object.keys(studentObservations).length;
    return totalStudents > 0 ? Math.round((recordedStudents / totalStudents) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">수업 관찰 기록</h1>
              <p className="text-gray-600 mt-2">키워드 기반으로 학생들의 학습 활동을 빠르게 기록하세요</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant={viewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('single')}
              >
                개별 기록
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

          {/* 세션 정보 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="class-select">학급 선택</Label>
              <select
                id="class-select"
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const selected = classes.find(c => c.id === e.target.value);
                  if (selected) handleClassSelect(selected);
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
              <Label htmlFor="session-date">수업 날짜</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="subject">교과</Label>
              <Input
                id="subject"
                placeholder="예: 국어, 수학"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lesson-topic">수업 주제</Label>
              <Input
                id="lesson-topic"
                placeholder="예: 문단의 중심 생각 찾기"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 진행률 표시 */}
          {selectedClass && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  진행률: {getProgress()}% ({Object.keys(studentObservations).length}/{studentNames.length})
                </span>
                <div className="w-32 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>
              
              <Button
                onClick={handleSaveSession}
                disabled={isSaving || Object.keys(studentObservations).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? '저장 중...' : '관찰 기록 저장'}
              </Button>
            </div>
          )}
        </div>

        {/* 학생 관찰 기록 영역 */}
        {selectedClass && (
          <div className="space-y-6">
            {viewMode === 'single' ? (
              // 개별 학생 기록 모드
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold">
                      {currentStudentName} ({currentStudentIndex + 1}/{studentNames.length})
                    </h2>
                    {studentObservations[currentStudentName] && (
                      <Badge variant="secondary">기록됨</Badge>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={handlePrevStudent}
                      disabled={currentStudentIndex === 0}
                    >
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNextStudent}
                      disabled={currentStudentIndex === studentNames.length - 1}
                    >
                      다음
                    </Button>
                  </div>
                </div>

                {currentStudentName && (
                  <KeywordCheckboxSystem
                    studentName={currentStudentName}
                    onObservationChange={(obs) => handleObservationChange(currentStudentName, obs)}
                    initialData={studentObservations[currentStudentName]}
                  />
                )}
              </Card>
            ) : (
              // 전체 학생 그리드 모드
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {studentNames.map(studentName => (
                  <Card key={studentName} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{studentName}</h3>
                      {studentObservations[studentName] && (
                        <Badge variant="secondary">
                          {studentObservations[studentName].selected_keywords.length}개 키워드
                        </Badge>
                      )}
                    </div>
                    
                    <KeywordCheckboxSystem
                      studentName={studentName}
                      onObservationChange={(obs) => handleObservationChange(studentName, obs)}
                      initialData={studentObservations[studentName]}
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        {!selectedClass && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">관찰 기록 시작하기</h3>
              <p className="text-gray-600">
                먼저 학급을 선택하고 수업 정보를 입력한 후,<br />
                학생별 관찰 내용을 키워드로 빠르게 기록하세요.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}