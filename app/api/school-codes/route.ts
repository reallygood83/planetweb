import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueCode } from '@/lib/code-generator'

// GET: 사용자가 참여한 학교 코드 목록 조회
export async function GET() {
  try {
    console.log('School codes GET request started')
    
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase 설정이 필요합니다')
      return NextResponse.json({ error: 'Database configuration required' }, { status: 500 })
    }

    console.log('Creating Supabase client...')
    const supabase = await createClient()
    
    // 현재 사용자 확인
    console.log('Getting user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth error: ' + authError.message }, { status: 401 })
    }
    if (!user) {
      console.log('No user found')
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }

    console.log('User found:', user.email, 'ID:', user.id)

    // 학교 코드 테이블 존재 확인을 위한 간단한 쿼리
    console.log('Checking school_codes table...')
    try {
      const { count } = await supabase
        .from('school_codes')
        .select('*', { count: 'exact', head: true })
      
      console.log('Table check successful, total rows:', count)
    } catch (tableError: any) {
      console.error('Table check failed:', tableError)
      
      // 테이블이 존재하지 않는 경우
      if (tableError.code === '42P01' || tableError.message?.includes('relation')) {
        console.log('school_codes 테이블이 존재하지 않음 - 빈 배열 반환')
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: 'school_codes 테이블이 존재하지 않습니다. 첫 번째 학교 코드를 생성해보세요.'
        })
      }
      
      // 다른 오류인 경우
      return NextResponse.json({ 
        error: '테이블 상태 확인 중 오류가 발생했습니다.',
        details: tableError.message 
      }, { status: 500 })
    }

    // 사용자가 참여한 학교 코드 목록 조회
    console.log('Querying school codes for user...')
    const { data: schoolCodes, error } = await supabase
      .from('school_codes')
      .select('*')
      .or(`creator_id.eq.${user.id},members.cs.["${user.email}"]`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('학교 코드 조회 실패:', error)
      return NextResponse.json({ 
        error: '학교 코드를 불러올 수 없습니다.', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Found school codes:', schoolCodes?.length || 0)
    return NextResponse.json({ success: true, data: schoolCodes || [] })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
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
      
      // 테이블이 없는 경우 안내 메시지 제공
      if (createError.code === '42P01' || createError.message?.includes('relation')) {
        return NextResponse.json({ 
          error: 'school_codes 테이블이 존재하지 않습니다. 데이터베이스 마이그레이션이 필요합니다.',
          details: '관리자에게 문의하거나 Supabase 대시보드에서 마이그레이션을 실행해주세요.'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: '학교 코드 생성에 실패했습니다.',
        details: createError.message 
      }, { status: 500 })
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