import { NextResponse } from 'next/server'

// 학교 코드 가입 API는 더 이상 사용하지 않습니다.
export async function POST() {
  return NextResponse.json({ 
    error: '학교 코드 시스템은 더 이상 사용되지 않습니다.'
  }, { status: 410 })
}