import { NextResponse } from 'next/server'

// 학교 코드 관련 API는 더 이상 사용하지 않습니다.
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    data: []
  })
}

export async function POST() {
  return NextResponse.json({ 
    error: '학교 코드 시스템은 더 이상 사용되지 않습니다.'
  }, { status: 410 })
}