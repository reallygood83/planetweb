'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Class } from '@/types'
import { Pencil, Trash2, Users } from 'lucide-react'

interface ClassListProps {
  classes: Class[]
  onEdit: (classData: Class) => void
  onDelete: (classId: string) => void
}

export function ClassList({ classes, onEdit, onDelete }: ClassListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {classes.map((classData) => (
        <Card key={classData.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{classData.class_name}</CardTitle>
                <CardDescription>
                  {classData.grade} • {classData.semester}
                  {classData.teacher && ` • ${classData.teacher}`}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(classData)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(classData.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>학생 {classData.students?.length || 0}명</span>
              </div>
              
              {classData.students && classData.students.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">학생 목록:</p>
                  <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                    {classData.students.slice(0, 5).map((student, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-xs">{student.number}번</span>
                        <span>{student.name}</span>
                      </div>
                    ))}
                    {classData.students && classData.students.length > 5 && (
                      <div className="text-xs text-gray-500">
                        외 {(classData.students?.length || 0) - 5}명...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  생성일: {formatDate(classData.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}