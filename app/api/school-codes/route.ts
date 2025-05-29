import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueCode, validateCode } from '@/lib/code-generator'

// GET: 사용자가 참여한 학교 코드 목록 조회
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

    // 사용자가 참여한 학교 코드 목록 조회
    const { data: schoolCodes, error } = await supabase
      .from('school_codes')
      .select('*')
      .or(`creator_id.eq.${user.id},members.cs.["${user.email}"]`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('학교 코드 조회 실패:', error)
      return NextResponse.json({ error: '학교 코드를 불러올 수 없습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: schoolCodes || [] })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 새로운 학교 코드 생성
export async function POST(request: NextRequest) {
  let body: any = {}
  
  try {
    console.log('School code POST request received')
    body = await request.json()
    console.log('Request body:', body)
    const { group_name, description, school_name, target_grade, primary_subject } = body

    // 필수 필드 검증
    if (!group_name || !description || !school_name) {
      return NextResponse.json(
        { error: 'group_name, description, and school_name are required' }, 
        { status: 400 }
      )
    }

    // 안전하고 유니크한 학교 코드 생성
    const codeResult = await generateUniqueCode('SCHOOL')
    
    if (!codeResult.success || !codeResult.code) {
      console.error('학교 코드 생성 실패:', codeResult.error)
      return NextResponse.json(
        { error: codeResult.error || '코드 생성에 실패했습니다.' }, 
        { status: 500 }
      )
    }
    
    const code = codeResult.code

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

    // 학교 코드 생성
    const { data: newSchoolCode, error: createError } = await supabase
      .from('school_codes')
      .insert([{
        code,
        group_name,
        description,
        school_name,
        target_grade: target_grade || null,
        primary_subject: primary_subject || null,
        creator_id: user.id,
        creator_email: user.email,
        members: [user.email] // 생성자를 멤버로 추가
      }])
      .select()
      .single()

    if (createError) {
      console.error('학교 코드 생성 실패:', createError)
      return NextResponse.json({ error: '학교 코드 생성에 실패했습니다.' }, { status: 500 })
    }

    console.log(`새 학교 코드 생성됨: ${code} (시도 횟수: ${codeResult.attempts})`)
    return NextResponse.json({ success: true, data: newSchoolCode }, { status: 201 })
  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    )
  }
}