import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueCode } from '@/lib/code-generator'

// GET: 사용자의 모든 학급 조회
export async function GET() {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase 설정이 필요합니다')
      return NextResponse.json({ error: 'Database configuration required' }, { status: 500 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 모든 학급 조회
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('학급 조회 실패:', error)
      return NextResponse.json({ error: '학급 데이터를 불러올 수 없습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: classes || [] })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 새로운 학급 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { class_name, grade, semester, teacher, students = [] } = body

    // 필수 필드 검증
    if (!class_name || !grade || !semester) {
      return NextResponse.json(
        { error: 'class_name, grade, semester are required' }, 
        { status: 400 }
      )
    }

    // 안전하고 유니크한 학급 코드 생성
    const codeResult = await generateUniqueCode('CLASS')
    
    if (!codeResult.success || !codeResult.code) {
      console.error('학급 코드 생성 실패:', codeResult.error)
      return NextResponse.json(
        { error: codeResult.error || '코드 생성에 실패했습니다.' }, 
        { status: 500 }
      )
    }
    
    const school_code = codeResult.code

    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase 설정이 필요합니다')
      return NextResponse.json({ error: 'Database configuration required' }, { status: 500 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 학급명 중복 확인
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_name', class_name)
      .single()

    if (existingClass) {
      return NextResponse.json(
        { error: '이미 존재하는 학급명입니다.' }, 
        { status: 409 }
      )
    }

    // 새 학급 생성
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert([{
        user_id: user.id,
        class_name,
        grade,
        semester,
        teacher,
        students,
        school_code
      }])
      .select()
      .single()

    if (error) {
      console.error('학급 생성 실패:', error)
      return NextResponse.json({ error: '학급 생성에 실패했습니다.' }, { status: 500 })
    }

    console.log(`새 학급 생성됨: ${class_name} (코드: ${school_code}, 시도 횟수: ${codeResult.attempts})`)
    return NextResponse.json({ success: true, data: newClass }, { status: 201 })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}