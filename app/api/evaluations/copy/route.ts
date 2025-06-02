import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { evaluationId, shareCode } = await request.json()

    if (!evaluationId && !shareCode) {
      return NextResponse.json({ error: 'evaluationId 또는 shareCode가 필요합니다.' }, { status: 400 })
    }

    let sourceEvaluation
    
    if (shareCode) {
      // 공유 코드로 평가계획 조회
      const { data: shareData, error: shareError } = await supabase
        .from('evaluation_shares')
        .select(`
          evaluation_id,
          allow_copy,
          expires_at,
          evaluations (*)
        `)
        .eq('share_code', shareCode)
        .single()

      if (shareError || !shareData) {
        return NextResponse.json({ error: '공유된 평가계획을 찾을 수 없습니다.' }, { status: 404 })
      }

      // 만료일 체크
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        return NextResponse.json({ error: '공유 링크가 만료되었습니다.' }, { status: 400 })
      }

      // 복사 권한 체크
      if (!shareData.allow_copy) {
        return NextResponse.json({ error: '이 평가계획은 복사가 허용되지 않습니다.' }, { status: 403 })
      }

      sourceEvaluation = shareData.evaluations
    } else {
      // 직접 평가계획 ID로 조회 (같은 사용자의 평가계획만)
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .eq('user_id', user.id)
        .single()

      if (evalError || !evalData) {
        return NextResponse.json({ error: '평가계획을 찾을 수 없습니다.' }, { status: 404 })
      }

      sourceEvaluation = evalData
    }

    // 복사할 평가계획 데이터 준비 (기존 메타데이터 제외)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, user_id, ...evaluationData } = sourceEvaluation
    
    // 제목에 "(복사본)" 추가하여 중복 방지
    const copyTitle = evaluationData.title.includes('(복사본)') 
      ? evaluationData.title 
      : `${evaluationData.title} (복사본)`

    const newEvaluationData = {
      ...evaluationData,
      title: copyTitle,
      user_id: user.id,
    }

    // 새 평가계획 생성
    const { data: newEvaluation, error: createError } = await supabase
      .from('evaluations')
      .insert(newEvaluationData)
      .select()
      .single()

    if (createError) {
      console.error('평가계획 복사 실패:', createError)
      return NextResponse.json({ error: '평가계획 복사에 실패했습니다.' }, { status: 500 })
    }

    // 공유 코드로 복사한 경우 조회수 증가
    if (shareCode) {
      await supabase
        .from('evaluation_shares')
        .update({ 
          view_count: supabase.rpc('increment', { row_id: shareCode }) 
        })
        .eq('share_code', shareCode)
    }

    return NextResponse.json({ 
      success: true, 
      evaluation: newEvaluation,
      message: '평가계획이 성공적으로 복사되었습니다.' 
    })

  } catch (error) {
    console.error('평가계획 복사 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}