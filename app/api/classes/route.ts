import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSimpleCode, generateTimeBasedCode } from '@/lib/simple-code-generator'

// GET: 사용자의 모든 학급 조회
export async function GET() {
  try {
    console.log('=== 학급 목록 조회 시작 ===')
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('인증 오류 또는 사용자 없음')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('사용자 확인됨:', user.email)

    // 사용자의 모든 학급 조회
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('학급 조회 오류:', error.code, error.message)
      return NextResponse.json({ 
        error: '학급 데이터를 불러올 수 없습니다.',
        details: error.message 
      }, { status: 500 })
    }

    console.log('학급 조회 성공:', classes?.length || 0, '개')
    return NextResponse.json({ success: true, data: classes || [] })
    
  } catch (error: any) {
    console.error('학급 GET 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 })
  }
}

// POST: 새로운 학급 생성
export async function POST(request: NextRequest) {
  try {
    console.log('=== 학급 생성 시작 ===')
    
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Supabase URL 존재:', !!supabaseUrl)
    console.log('Supabase Key 존재:', !!supabaseKey)
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ 
        error: 'Database not configured',
        details: 'Please configure Supabase connection'
      }, { status: 503 })
    }
    
    const body = await request.json()
    const { class_name, grade, semester, teacher, students = [], school_code: manualSchoolCode } = body

    // 필수 필드 검증
    if (!class_name || !grade || !semester) {
      return NextResponse.json(
        { error: '학급명, 학년, 학기는 필수입니다.' }, 
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('사용자 확인됨:', user.email)

    // 학급명 중복 확인
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_name', class_name)
      .maybeSingle()

    if (existingClass) {
      return NextResponse.json(
        { error: '이미 존재하는 학급명입니다.' }, 
        { status: 409 }
      )
    }

    let school_code = ''
    
    // 수동 학급 코드가 제공되었을 경우
    if (manualSchoolCode) {
      // 코드 형식 검증
      const codePattern = /^[A-Z0-9]{4,10}$/
      if (!codePattern.test(manualSchoolCode.toUpperCase())) {
        return NextResponse.json({ 
          error: '학급 코드는 4-10자의 영문 대문자와 숫자로만 구성되어야 합니다.' 
        }, { status: 400 })
      }
      
      school_code = manualSchoolCode.toUpperCase()
      console.log('수동 입력 학급 코드:', school_code)
      
      // 중복 검사
      const { data: existing, error: checkError } = await supabase
        .from('classes')
        .select('id')
        .eq('school_code', school_code)
        .maybeSingle()
      
      if (checkError) {
        console.log('중복 확인 오류:', checkError)
        return NextResponse.json({ 
          error: '코드 중복 확인 중 오류가 발생했습니다.' 
        }, { status: 500 })
      }
      
      if (existing) {
        return NextResponse.json({ 
          error: '이미 사용 중인 학급 코드입니다. 다른 코드를 입력해주세요.' 
        }, { status: 400 })
      }
    } else {
      // 코드가 제공되지 않았을 경우 자동 생성 (기존 로직)
      let attempts = 0
      let isUnique = false
      
      while (attempts < 10 && !isUnique) {
        attempts++
        
        // 처음 5번은 기본 생성, 나머지는 시간 기반
        school_code = attempts <= 5 
          ? generateSimpleCode('CLASS')
          : generateTimeBasedCode('CLASS')
        
        console.log(`학급 코드 생성 시도 ${attempts}: ${school_code}`)
        
        // 중복 확인
        const { data: existing, error: checkError } = await supabase
          .from('classes')
          .select('id')
          .eq('school_code', school_code)
          .maybeSingle()
        
        if (checkError) {
          console.log('중복 확인 오류:', checkError)
          // 오류가 있어도 일단 진행
          isUnique = true
          break
        }
        
        if (!existing) {
          console.log('유니크한 학급 코드 생성됨:', school_code)
          isUnique = true
        } else {
          console.log('학급 코드 중복됨, 재시도...')
        }
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: '코드 생성에 실패했습니다. 직접 코드를 입력해주세요.' }, 
          { status: 500 }
        )
      }
    }

    // 새 학급 생성
    const newData = {
      user_id: user.id,
      class_name,
      grade,
      semester,
      teacher,
      students,
      school_code
    }

    console.log('데이터베이스에 학급 삽입 시도...')
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert([newData])
      .select()
      .single()

    if (error) {
      console.error('학급 생성 실패:', error)
      return NextResponse.json({ 
        error: '학급 생성에 실패했습니다.',
        details: error.message 
      }, { status: 500 })
    }

    console.log('학급 생성 성공:', class_name, '(코드:', school_code, ')')
    return NextResponse.json({ success: true, data: newClass }, { status: 201 })
    
  } catch (error: any) {
    console.error('학급 POST 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 })
  }
}