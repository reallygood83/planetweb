'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AchievementLevel, 
  StudentAchievement,
  ACHIEVEMENT_PRESETS 
} from '@/lib/types/teacher-evaluation';

interface AchievementLevelInputProps {
  studentName: string;
  studentNumber?: number;
  evaluationAreas?: string[];
  onAchievementChange: (achievement: StudentAchievement) => void;
  initialData?: StudentAchievement;
}

export default function AchievementLevelInput({
  studentName,
  studentNumber,
  evaluationAreas = [],
  onAchievementChange,
  initialData
}: AchievementLevelInputProps) {
  const [overallLevel, setOverallLevel] = useState<AchievementLevel>(
    initialData?.achievement_level || '보통'
  );
  const [areaLevels, setAreaLevels] = useState<Record<string, AchievementLevel>>(
    initialData?.achievement_details || {}
  );
  const [comment, setComment] = useState(initialData?.teacher_comment || '');
  const [achievements, setAchievements] = useState<string[]>(
    initialData?.specific_achievements || []
  );
  const [improvements, setImprovements] = useState<string[]>(
    initialData?.improvement_areas || []
  );
  const [usePreset, setUsePreset] = useState(true);

  // 전체 레벨 변경 시 프리셋 적용
  useEffect(() => {
    if (usePreset && !initialData) {
      const preset = ACHIEVEMENT_PRESETS[overallLevel];
      setComment(preset.common_comments[0]);
      setAchievements(preset.common_achievements.slice(0, 3));
      setImprovements(preset.common_improvements.slice(0, 2));
    }
  }, [overallLevel, usePreset, initialData]);

  // 변경사항을 부모 컴포넌트에 전달
  useEffect(() => {
    const achievement: StudentAchievement = {
      student_name: studentName,
      student_number: studentNumber,
      achievement_level: overallLevel,
      achievement_details: evaluationAreas.length > 0 ? areaLevels : undefined,
      teacher_comment: comment,
      specific_achievements: achievements.filter(Boolean),
      improvement_areas: improvements.filter(Boolean),
      evaluated_at: new Date().toISOString()
    };
    onAchievementChange(achievement);
  }, [overallLevel, areaLevels, comment, achievements, improvements, 
      studentName, studentNumber, evaluationAreas, onAchievementChange]);

  // 성취수준 색상
  const getLevelColor = (level: AchievementLevel) => {
    switch (level) {
      case '매우잘함': return 'text-green-700 bg-green-50 border-green-200';
      case '잘함': return 'text-blue-700 bg-blue-50 border-blue-200';
      case '보통': return 'text-gray-700 bg-gray-50 border-gray-200';
      case '노력요함': return 'text-orange-700 bg-orange-50 border-orange-200';
    }
  };

  const levels: AchievementLevel[] = ['매우잘함', '잘함', '보통', '노력요함'];

  return (
    <Card className="p-6 space-y-6">
      {/* 학생 정보 헤더 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">
            {studentNumber && `${studentNumber}. `}{studentName}
          </h3>
          <Badge className={getLevelColor(overallLevel)}>
            {overallLevel}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`preset-${studentName}`}
            checked={usePreset}
            onCheckedChange={(checked) => setUsePreset(checked as boolean)}
          />
          <Label 
            htmlFor={`preset-${studentName}`} 
            className="text-sm font-normal cursor-pointer"
          >
            프리셋 사용
          </Label>
        </div>
      </div>

      {/* 종합 성취수준 선택 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">종합 성취수준</Label>
        <RadioGroup
          value={overallLevel}
          onValueChange={(value) => setOverallLevel(value as AchievementLevel)}
          className="grid grid-cols-4 gap-3"
        >
          {levels.map(level => (
            <label
              key={level}
              className={`
                flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer
                transition-all duration-200 hover:shadow-md
                ${overallLevel === level 
                  ? getLevelColor(level) + ' border-2' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <RadioGroupItem value={level} className="sr-only" />
              <span className="font-medium">{level}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* 영역별 성취수준 (옵션) */}
      {evaluationAreas.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">영역별 성취수준</Label>
          <div className="space-y-2">
            {evaluationAreas.map(area => (
              <div key={area} className="flex items-center space-x-3">
                <span className="w-24 text-sm font-medium">{area}</span>
                <RadioGroup
                  value={areaLevels[area] || '보통'}
                  onValueChange={(value) => 
                    setAreaLevels(prev => ({ ...prev, [area]: value as AchievementLevel }))
                  }
                  className="flex space-x-2"
                >
                  {levels.map(level => (
                    <label
                      key={level}
                      className={`
                        px-3 py-1 rounded-md border cursor-pointer text-sm
                        ${areaLevels[area] === level 
                          ? getLevelColor(level) 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <RadioGroupItem value={level} className="sr-only" />
                      {level}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 교사 평가 코멘트 */}
      <div className="space-y-2">
        <Label htmlFor={`comment-${studentName}`}>평가 코멘트</Label>
        <Textarea
          id={`comment-${studentName}`}
          placeholder="학생의 학습 태도, 성취 수준, 특징적인 모습 등을 기록하세요..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="text-sm"
        />
        {usePreset && (
          <div className="flex flex-wrap gap-2 mt-2">
            {ACHIEVEMENT_PRESETS[overallLevel].common_comments.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setComment(preset)}
                className="text-xs"
              >
                {preset.substring(0, 20)}...
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 구체적 성취 사항 */}
      <div className="space-y-2">
        <Label>구체적 성취 사항</Label>
        <div className="flex flex-wrap gap-2">
          {(usePreset ? ACHIEVEMENT_PRESETS[overallLevel].common_achievements : [
            '창의적 문제해결', '우수한 발표력', '협력적 태도', '자기주도학습',
            '성실한 과제수행', '적극적 참여', '리더십', '배려심'
          ]).map(achievement => (
            <label
              key={achievement}
              className={`
                px-3 py-1.5 rounded-full border cursor-pointer text-sm
                transition-colors duration-200
                ${achievements.includes(achievement)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <Checkbox
                checked={achievements.includes(achievement)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setAchievements(prev => [...prev, achievement]);
                  } else {
                    setAchievements(prev => prev.filter(a => a !== achievement));
                  }
                }}
                className="sr-only"
              />
              {achievement}
            </label>
          ))}
        </div>
      </div>

      {/* 개선 필요 영역 */}
      <div className="space-y-2">
        <Label>개선 필요 영역</Label>
        <div className="flex flex-wrap gap-2">
          {(usePreset ? ACHIEVEMENT_PRESETS[overallLevel].common_improvements : [
            '기초 학습', '집중력', '자신감', '발표력', 
            '과제 완성도', '시간 관리', '협동심', '책임감'
          ]).map(improvement => (
            <label
              key={improvement}
              className={`
                px-3 py-1.5 rounded-full border cursor-pointer text-sm
                transition-colors duration-200
                ${improvements.includes(improvement)
                  ? 'bg-orange-100 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <Checkbox
                checked={improvements.includes(improvement)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setImprovements(prev => [...prev, improvement]);
                  } else {
                    setImprovements(prev => prev.filter(i => i !== improvement));
                  }
                }}
                className="sr-only"
              />
              {improvement}
            </label>
          ))}
        </div>
      </div>

      {/* 빠른 템플릿 적용 */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setComment('');
            setAchievements([]);
            setImprovements([]);
          }}
        >
          초기화
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // 이전 학생과 동일하게 적용하는 기능
            console.log('이전 학생 설정 복사');
          }}
        >
          이전 학생과 동일
        </Button>
      </div>
    </Card>
  );
}