import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateCode, detectCodeType, normalizeCode } from '@/lib/code-generator'

/**
 * 코드 재생성 API
 * POST /api/codes/regenerate
 */
export async function POST(request: NextRequest) {
  try {
    const { oldCode, recordId } = await request.json()
    
    if (!oldCode || !recordId) {
      return NextResponse.json(
        { error: '기존 코드와 레코드 ID가 필요합니다.' }, 
        { status: 400 }
      )
    }
    
    // 사용자 인증 확인
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 코드 정규화 및 타입 감지
    const normalizedOldCode = normalizeCode(oldCode)
    const codeType = detectCodeType(normalizedOldCode)
    
    if (!codeType) {
      return NextResponse.json(
        { error: '유효하지 않은 코드 형식입니다.' }, 
        { status: 400 }
      )
    }
    
    // 새 코드 생성
    const newCodeResult = await regenerateCode(normalizedOldCode, codeType)
    
    if (!newCodeResult.success || !newCodeResult.code) {
      return NextResponse.json(
        { error: newCodeResult.error || '새 코드 생성에 실패했습니다.' }, 
        { status: 500 }
      )
    }
    
    // 데이터베이스 업데이트
    let updateResult
    
    if (codeType === 'SCHOOL') {
      updateResult = await supabase
        .from('school_codes')
        .update({ code: newCodeResult.code, updated_at: new Date().toISOString() })
        .eq('id', recordId)
        .eq('creator_id', user.id) // 보안: 생성자만 수정 가능
        .select()
        .single()
    } else {
      updateResult = await supabase
        .from('classes')
        .update({ school_code: newCodeResult.code, updated_at: new Date().toISOString() })
        .eq('id', recordId)
        .eq('user_id', user.id) // 보안: 소유자만 수정 가능
        .select()
        .single()
    }
    
    if (updateResult.error) {
      console.error('코드 업데이트 실패:', updateResult.error)
      return NextResponse.json(
        { error: '데이터베이스 업데이트에 실패했습니다.' }, 
        { status: 500 }
      )
    }
    
    console.log(`코드 재생성 완료: ${normalizedOldCode} → ${newCodeResult.code} (시도 횟수: ${newCodeResult.attempts})`)
    
    return NextResponse.json({
      success: true,
      oldCode: normalizedOldCode,
      newCode: newCodeResult.code,
      codeType,
      attempts: newCodeResult.attempts,
      updatedRecord: updateResult.data
    })
    
  } catch (error) {
    console.error('코드 재생성 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    )
  }
}