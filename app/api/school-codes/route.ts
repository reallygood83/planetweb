import { NextResponse } from 'next/server'

// 학교 코드 관련 API는 더 이상 사용하지 않습니다.
// 새로운 공유 시스템을 사용해주세요:
// - 평가계획 공유: /api/share/evaluation
// - 설문 공유: /api/share/survey

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    data: [],
    message: '학교 코드 시스템은 더 이상 사용되지 않습니다. 새로운 공유 시스템을 사용해주세요.'
  })
}

export async function POST() {
  return NextResponse.json({ 
    error: '학교 코드 시스템은 더 이상 사용되지 않습니다. 평가계획 공유나 설문 공유 기능을 사용해주세요.'
  }, { status: 410 }) // Gone
}