'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { EvaluationPlan } from '@/lib/types/evaluation'
import { EvaluationCard } from './EvaluationCard'
import { 
  Search, 
  Filter, 
  Trash2, 
  ChevronDown, 
  BookOpen, 
  Calendar,
  GraduationCap,
  Archive
} from 'lucide-react'

interface EvaluationManagerProps {
  evaluations: EvaluationPlan[]
  onDelete: (evaluationId: string) => void
  onEdit?: (evaluation: EvaluationPlan) => void
  onGenerateSurvey?: (evaluation: EvaluationPlan) => void
  onShare?: (evaluation: EvaluationPlan) => void
  onBulkDelete?: (evaluationIds: string[]) => void
}

type GroupBy = 'none' | 'subject' | 'grade' | 'semester' | 'year'
type SortBy = 'created_at' | 'subject' | 'grade' | 'semester'

export function EvaluationManager({ 
  evaluations, 
  onDelete, 
  onEdit, 
  onGenerateSurvey, 
  onShare,
  onBulkDelete 
}: EvaluationManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set())
  const [selectedSemesters, setSelectedSemesters] = useState<Set<string>>(new Set())

  // 년도 추출 함수
  const getYearFromDate = (dateString: string) => {
    return new Date(dateString).getFullYear().toString()
  }

  // 고유 값들 추출
  const uniqueSubjects = useMemo(() => 
    [...new Set(evaluations.map(e => e.subject))].sort()
  , [evaluations])

  const uniqueGrades = useMemo(() => 
    [...new Set(evaluations.map(e => e.grade))].sort()
  , [evaluations])

  const uniqueSemesters = useMemo(() => 
    [...new Set(evaluations.map(e => e.semester))].sort()
  , [evaluations])

  // const uniqueYears = useMemo(() => 
  //   [...new Set(evaluations.map(e => getYearFromDate(e.created_at)))].sort((a, b) => b.localeCompare(a))
  // , [evaluations])

  // 필터링된 평가계획
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(evaluation => {
      // 검색어 필터
      const matchesSearch = !searchTerm || 
        evaluation.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.grade.toLowerCase().includes(searchTerm.toLowerCase())

      // 과목 필터
      const matchesSubject = selectedSubjects.size === 0 || selectedSubjects.has(evaluation.subject)
      
      // 학년 필터
      const matchesGrade = selectedGrades.size === 0 || selectedGrades.has(evaluation.grade)
      
      // 학기 필터
      const matchesSemester = selectedSemesters.size === 0 || selectedSemesters.has(evaluation.semester)

      return matchesSearch && matchesSubject && matchesGrade && matchesSemester
    })
  }, [evaluations, searchTerm, selectedSubjects, selectedGrades, selectedSemesters])

  // 정렬된 평가계획
  const sortedEvaluations = useMemo(() => {
    return [...filteredEvaluations].sort((a, b) => {
      switch (sortBy) {
        case 'subject':
          return a.subject.localeCompare(b.subject)
        case 'grade':
          return a.grade.localeCompare(b.grade)
        case 'semester':
          return a.semester.localeCompare(b.semester)
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [filteredEvaluations, sortBy])

  // 그룹화된 평가계획
  const groupedEvaluations = useMemo(() => {
    if (groupBy === 'none') {
      return { '전체': sortedEvaluations }
    }

    const groups: Record<string, EvaluationPlan[]> = {}
    
    sortedEvaluations.forEach(evaluation => {
      let groupKey: string
      
      switch (groupBy) {
        case 'subject':
          groupKey = evaluation.subject
          break
        case 'grade':
          groupKey = evaluation.grade
          break
        case 'semester':
          groupKey = evaluation.semester
          break
        case 'year':
          groupKey = `${getYearFromDate(evaluation.created_at)}년`
          break
        default:
          groupKey = '전체'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(evaluation)
    })
    
    return groups
  }, [sortedEvaluations, groupBy])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedEvaluations.map(e => e.id).filter(Boolean) as string[]))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectEvaluation = (evaluationId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(evaluationId)
    } else {
      newSelected.delete(evaluationId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    
    const confirmMessage = `선택한 ${selectedIds.size}개의 평가계획을 삭제하시겠습니까?`
    if (!confirm(confirmMessage)) return
    
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleBulkDeleteByGroup = (groupKey: string) => {
    const groupEvaluations = groupedEvaluations[groupKey]
    const groupIds = groupEvaluations.map(e => e.id).filter(Boolean) as string[]
    
    if (groupIds.length === 0) return
    
    const confirmMessage = `"${groupKey}" 그룹의 ${groupIds.length}개 평가계획을 모두 삭제하시겠습니까?`
    if (!confirm(confirmMessage)) return
    
    if (onBulkDelete) {
      onBulkDelete(groupIds)
    }
  }

  const clearFilters = () => {
    setSelectedSubjects(new Set())
    setSelectedGrades(new Set())
    setSelectedSemesters(new Set())
    setSearchTerm('')
  }

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 컨트롤 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">평가계획 관리</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                필터
                <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  선택 삭제 ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            총 {filteredEvaluations.length}개의 평가계획 
            {selectedIds.size > 0 && ` (${selectedIds.size}개 선택됨)`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 검색 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">검색</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="search"
                  placeholder="과목명, 단원명, 학년으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* 정렬 및 그룹화 */}
          <div className="flex gap-4">
            <div>
              <Label htmlFor="sortBy">정렬</Label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="created_at">생성일순</option>
                <option value="subject">과목명순</option>
                <option value="grade">학년순</option>
                <option value="semester">학기순</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="groupBy">그룹화</Label>
              <select
                id="groupBy"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="none">그룹화 없음</option>
                <option value="subject">과목별</option>
                <option value="grade">학년별</option>
                <option value="semester">학기별</option>
                <option value="year">년도별</option>
              </select>
            </div>
          </div>

          {/* 전체 선택 */}
          {filteredEvaluations.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.size === filteredEvaluations.length && filteredEvaluations.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all">전체 선택</Label>
              </div>
            </div>
          )}

          {/* 상세 필터 */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">상세 필터</h4>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  필터 초기화
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 과목 필터 */}
                <div>
                  <Label>과목</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {uniqueSubjects.map(subject => (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject}`}
                          checked={selectedSubjects.has(subject)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedSubjects)
                            if (checked) {
                              newSelected.add(subject)
                            } else {
                              newSelected.delete(subject)
                            }
                            setSelectedSubjects(newSelected)
                          }}
                        />
                        <Label htmlFor={`subject-${subject}`} className="text-sm">
                          {subject}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 학년 필터 */}
                <div>
                  <Label>학년</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {uniqueGrades.map(grade => (
                      <div key={grade} className="flex items-center space-x-2">
                        <Checkbox
                          id={`grade-${grade}`}
                          checked={selectedGrades.has(grade)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedGrades)
                            if (checked) {
                              newSelected.add(grade)
                            } else {
                              newSelected.delete(grade)
                            }
                            setSelectedGrades(newSelected)
                          }}
                        />
                        <Label htmlFor={`grade-${grade}`} className="text-sm">
                          {grade}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 학기 필터 */}
                <div>
                  <Label>학기</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {uniqueSemesters.map(semester => (
                      <div key={semester} className="flex items-center space-x-2">
                        <Checkbox
                          id={`semester-${semester}`}
                          checked={selectedSemesters.has(semester)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedSemesters)
                            if (checked) {
                              newSelected.add(semester)
                            } else {
                              newSelected.delete(semester)
                            }
                            setSelectedSemesters(newSelected)
                          }}
                        />
                        <Label htmlFor={`semester-${semester}`} className="text-sm">
                          {semester}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 그룹별 평가계획 표시 */}
      <div className="space-y-6">
        {Object.entries(groupedEvaluations).map(([groupKey, groupEvaluations]) => (
          <div key={groupKey}>
            {groupBy !== 'none' && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {groupBy === 'subject' && <BookOpen className="h-5 w-5 text-blue-600" />}
                  {groupBy === 'grade' && <GraduationCap className="h-5 w-5 text-green-600" />}
                  {groupBy === 'semester' && <Calendar className="h-5 w-5 text-purple-600" />}
                  {groupBy === 'year' && <Archive className="h-5 w-5 text-orange-600" />}
                  <h3 className="text-xl font-semibold">{groupKey}</h3>
                  <span className="text-sm text-gray-500">({groupEvaluations.length}개)</span>
                </div>
                
                {groupEvaluations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkDeleteByGroup(groupKey)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    그룹 삭제
                  </Button>
                )}
              </div>
            )}

            {groupEvaluations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupEvaluations.map((evaluation) => (
                  <div key={evaluation.id} className="relative">
                    {/* 선택 체크박스 */}
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={evaluation.id ? selectedIds.has(evaluation.id) : false}
                        onCheckedChange={(checked) => {
                          if (evaluation.id) {
                            handleSelectEvaluation(evaluation.id, checked as boolean)
                          }
                        }}
                        className="bg-white shadow-sm border-2"
                      />
                    </div>
                    
                    {/* 평가계획 카드 */}
                    <div className="pl-8">
                      <EvaluationCard
                        evaluation={evaluation}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onGenerateSurvey={onGenerateSurvey}
                        onShare={onShare}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                해당 그룹에 평가계획이 없습니다.
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEvaluations.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            조건에 맞는 평가계획이 없습니다
          </h3>
          <p className="text-gray-500">
            검색어나 필터 조건을 변경해보세요.
          </p>
        </div>
      )}
    </div>
  )
}