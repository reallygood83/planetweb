import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 평가계획 공유 링크 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('공유 링크 생성 요청 - 사용자:', user?.email);
    
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { evaluationPlanId, allowCopy = false, expiresInDays = 30 } = body;

    console.log('요청 데이터:', { evaluationPlanId, allowCopy, expiresInDays });

    if (!evaluationPlanId) {
      return NextResponse.json({ error: '평가계획 ID가 필요합니다.' }, { status: 400 });
    }

    // 평가계획 소유권 확인
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluation_plans')
      .select('id, subject, grade, semester')
      .eq('id', evaluationPlanId)
      .eq('user_id', user.id)
      .single();

    if (evalError || !evaluation) {
      return NextResponse.json({ error: '평가계획을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 기존 공유 링크 확인
    const { data: existingShare, error: existingError } = await supabase
      .from('evaluation_shares')
      .select('*')
      .eq('evaluation_plan_id', evaluationPlanId)
      .eq('created_by', user.id)
      .maybeSingle();

    console.log('기존 공유 링크 확인:', { existingShare, existingError });

    if (existingShare) {
      // 기존 공유 설정 업데이트
      const { data: updated, error: updateError } = await supabase
        .from('evaluation_shares')
        .update({
          allow_copy: allowCopy,
          expires_at: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingShare.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        shareCode: existingShare.share_code,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/evaluation/${existingShare.share_code}`,
        ...updated
      });
    }

    // 새 공유 링크 생성 (안전한 방식)
    let shareCode = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && !shareCode) {
      attempts++;
      // 6자리 랜덤 코드 생성
      const randomCode = 'E' + Math.random().toString(36).substring(2, 7).toUpperCase();
      
      // 중복 체크
      const { data: existing } = await supabase
        .from('evaluation_shares')
        .select('id')
        .eq('share_code', randomCode)
        .maybeSingle();
      
      if (!existing) {
        shareCode = randomCode;
      }
    }
    
    if (!shareCode) {
      return NextResponse.json({ error: '공유 코드 생성에 실패했습니다.' }, { status: 500 });
    }

    const { data: newShare, error: insertError } = await supabase
      .from('evaluation_shares')
      .insert({
        evaluation_plan_id: evaluationPlanId,
        share_code: shareCode,
        created_by: user.id,
        allow_copy: allowCopy,
        expires_at: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      shareCode: newShare.share_code,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/evaluation/${newShare.share_code}`,
      ...newShare
    });

  } catch (error) {
    console.error('평가계획 공유 생성 오류:', error);
    return NextResponse.json({ error: '공유 링크 생성에 실패했습니다.' }, { status: 500 });
  }
}

// 공유된 평가계획 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get('code');

    console.log('공유 코드 조회 요청:', shareCode);

    if (!shareCode) {
      return NextResponse.json({ error: '공유 코드가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 첫 번째 단계: 공유 정보만 조회
    const { data: share, error: shareError } = await supabase
      .from('evaluation_shares')
      .select('*')
      .eq('share_code', shareCode)
      .maybeSingle();

    console.log('공유 정보 조회 결과:', { share, shareError });

    if (shareError) {
      console.error('공유 정보 조회 오류:', shareError);
      return NextResponse.json({ error: `데이터베이스 오류: ${shareError.message}` }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ error: '유효하지 않은 공유 코드입니다.' }, { status: 404 });
    }

    // 두 번째 단계: 평가계획 정보 조회
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluation_plans')
      .select('*')
      .eq('id', share.evaluation_plan_id)
      .maybeSingle();

    console.log('평가계획 조회 결과:', { evaluation, evalError });

    if (evalError) {
      console.error('평가계획 조회 오류:', evalError);
      return NextResponse.json({ error: `평가계획 조회 오류: ${evalError.message}` }, { status: 500 });
    }

    if (!evaluation) {
      return NextResponse.json({ error: '평가계획을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 세 번째 단계: 사용자 정보 조회
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', evaluation.user_id)
      .maybeSingle();

    console.log('사용자 정보 조회 결과:', { userProfile, userError });

    // 만료 확인
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: '만료된 공유 링크입니다.' }, { status: 410 });
    }

    // 조회수 증가 (안전한 방식)
    try {
      await supabase
        .from('evaluation_shares')
        .update({ 
          view_count: share.view_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('share_code', shareCode);
    } catch (updateError) {
      // 조회수 업데이트 실패는 무시 (핵심 기능에 영향 없음)
      console.warn('조회수 업데이트 실패:', updateError);
    }

    const result = {
      evaluation: evaluation,
      allowCopy: share.allow_copy,
      viewCount: share.view_count + 1,
      sharedBy: userProfile?.name || '익명',
      expiresAt: share.expires_at
    };

    console.log('최종 응답 데이터:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('공유 평가계획 조회 오류:', error);
    return NextResponse.json({ error: '평가계획 조회에 실패했습니다.' }, { status: 500 });
  }
}