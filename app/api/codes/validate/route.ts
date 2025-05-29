import { NextRequest, NextResponse } from 'next/server'
import { validateCode, detectCodeType, normalizeCode } from '@/lib/code-generator'

/**
 * 코드 유효성 검증 API
 * POST /api/codes/validate
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { error: '코드를 입력해주세요.' }, 
        { status: 400 }
      )
    }
    
    // 코드 정규화
    const normalizedCode = normalizeCode(code)
    
    // 코드 타입 자동 감지
    const detectedType = detectCodeType(normalizedCode)
    
    if (!detectedType) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 코드 형식입니다. (학교 코드: SXXXXX, 학급 코드: CXXXXX)',
        originalCode: code,
        normalizedCode
      })
    }
    
    // 코드 유효성 및 중복 검증
    const validation = await validateCode(normalizedCode, detectedType)
    
    return NextResponse.json({
      success: validation.isValid && validation.isAvailable,
      isValid: validation.isValid,
      isAvailable: validation.isAvailable,
      codeType: detectedType,
      originalCode: code,
      normalizedCode,
      existingRecord: validation.existingRecord,
      error: validation.error
    })
    
  } catch (error) {
    console.error('코드 검증 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    )
  }
}