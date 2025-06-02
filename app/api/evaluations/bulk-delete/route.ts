import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { evaluationIds } = await request.json()

    if (!evaluationIds || !Array.isArray(evaluationIds) || evaluationIds.length === 0) {
      return NextResponse.json({ error: '삭제할 평가계획 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자가 소유한 평가계획만 삭제할 수 있도록 검증
    const { data: ownedEvaluations, error: checkError } = await supabase
      .from('evaluation_plans')
      .select('id')
      .eq('user_id', user.id)
      .in('id', evaluationIds)

    if (checkError) {
      console.error('소유권 확인 오류:', checkError)
      return NextResponse.json({ error: '소유권 확인에 실패했습니다.' }, { status: 500 })
    }

    const ownedIds = ownedEvaluations?.map(e => e.id) || []
    
    if (ownedIds.length !== evaluationIds.length) {
      return NextResponse.json({ 
        error: '삭제 권한이 없는 평가계획이 포함되어 있습니다.' 
      }, { status: 403 })
    }

    // 관련된 데이터들도 함께 삭제 (CASCADE로 처리되지만 명시적으로 확인)
    console.log(`사용자 ${user.email}이 ${evaluationIds.length}개의 평가계획을 일괄 삭제 시도`)

    // 평가계획 일괄 삭제
    const { data: deletedEvaluations, error: deleteError } = await supabase
      .from('evaluation_plans')
      .delete()
      .eq('user_id', user.id)
      .in('id', evaluationIds)
      .select('id, subject, grade, semester')

    if (deleteError) {
      console.error('평가계획 일괄 삭제 오류:', deleteError)
      return NextResponse.json({ error: '평가계획 삭제에 실패했습니다.' }, { status: 500 })
    }

    console.log(`${deletedEvaluations?.length || 0}개의 평가계획이 성공적으로 삭제됨`)

    return NextResponse.json({
      success: true,
      deletedCount: deletedEvaluations?.length || 0,
      deletedEvaluations: deletedEvaluations,
      message: `${deletedEvaluations?.length || 0}개의 평가계획이 삭제되었습니다.`
    })

  } catch (error) {
    console.error('평가계획 일괄 삭제 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}