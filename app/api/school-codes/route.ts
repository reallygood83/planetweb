import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSimpleCode, generateTimeBasedCode } from '@/lib/simple-code-generator'

// GET: 사용자가 참여한 학교 코드 목록 조회
export async function GET() {
  try {
    console.log('=== 학교 코드 조회 시작 ===')
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('인증 오류 또는 사용자 없음')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('사용자 확인됨:', user.email)

    // 학교 그룹 조회 
    const { data: schoolCodes, error } = await supabase
      .from('school_groups')
      .select(`
        *,
        group_memberships!inner(
          user_id,
          role
        )
      `)
      .eq('group_memberships.user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('학교 코드 테이블 조회 오류:', error.code, error.message)
      
      // 테이블이 없는 경우 빈 배열 반환
      if (error.code === '42P01') {
        console.log('테이블 없음 - 빈 배열 반환')
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: '아직 생성된 학교 코드가 없습니다.'
        })
      }
      
      return NextResponse.json({ 
        error: '데이터를 불러올 수 없습니다.',
        details: error.message 
      }, { status: 500 })
    }

    console.log('학교 코드 조회 성공:', schoolCodes?.length || 0, '개')
    return NextResponse.json({ success: true, data: schoolCodes || [] })
    
  } catch (error: any) {
    console.error('학교 코드 GET 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 })
  }
}

// POST: 새로운 학교 코드 생성
export async function POST(request: NextRequest) {
  try {
    console.log('=== 학교 코드 생성 시작 ===')
    
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Supabase URL 존재:', !!supabaseUrl)
    console.log('Supabase Key 존재:', !!supabaseKey)
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('환경 변수 누락:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
      return NextResponse.json({ 
        error: 'Database configuration missing',
        details: 'Supabase environment variables not set'
      }, { status: 503 })
    }
    
    if (supabaseUrl.includes('placeholder')) {
      console.error('Supabase URL이 placeholder 상태')
      return NextResponse.json({ 
        error: 'Database not configured',
        details: 'Please configure Supabase connection'
      }, { status: 503 })
    }
    
    // 요청 본문 파싱 테스트
    let body
    try {
      body = await request.json()
      console.log('요청 본문:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const { code: manualCode, group_name, description, school_name, target_grade, primary_subject } = body

    // 필수 필드 검증
    if (!group_name || !description || !school_name) {
      return NextResponse.json(
        { error: '그룹명, 설명, 학교명은 필수입니다.' }, 
        { status: 400 }
      )
    }

    // Supabase 클라이언트 생성 테스트
    let supabase
    try {
      supabase = await createClient()
      console.log('Supabase 클라이언트 생성 성공')
    } catch (supabaseError) {
      console.error('Supabase 클라이언트 생성 오류:', supabaseError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }
    
    // 현재 사용자 확인
    let user
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('인증 오류:', authError)
        return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 })
      }
      if (!userData?.user) {
        console.log('사용자 없음')
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
      }
      user = userData.user
      console.log('사용자 확인됨:', user.email)
    } catch (userError) {
      console.error('사용자 조회 오류:', userError)
      return NextResponse.json({ error: 'User verification failed' }, { status: 500 })
    }

    let code = ''
    
    // 수동 코드가 제공되었을 경우
    if (manualCode) {
      // 코드 형식 검증
      const codePattern = /^[A-Z0-9]{4,10}$/
      if (!codePattern.test(manualCode.toUpperCase())) {
        return NextResponse.json({ 
          error: '코드는 4-10자의 영문 대문자와 숫자로만 구성되어야 합니다.' 
        }, { status: 400 })
      }
      
      code = manualCode.toUpperCase()
      console.log('수동 입력 코드:', code)
      
      // 중복 검사
      const { data: existing, error: checkError } = await supabase
        .from('school_groups')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      
      if (checkError && checkError.code !== '42P01') {
        console.log('중복 확인 오류:', checkError)
        return NextResponse.json({ 
          error: '코드 중복 확인 중 오류가 발생했습니다.' 
        }, { status: 500 })
      }
      
      if (existing) {
        return NextResponse.json({ 
          error: '이미 사용 중인 코드입니다. 다른 코드를 입력해주세요.' 
        }, { status: 400 })
      }
    } else {
      // 코드가 제공되지 않았을 경우 자동 생성 (기존 로직)
      let attempts = 0
      let isUnique = false
      
      while (attempts < 10 && !isUnique) {
        attempts++
        
        // 처음 5번은 기본 생성, 나머지는 시간 기반
        code = attempts <= 5 
          ? generateSimpleCode('SCHOOL')
          : generateTimeBasedCode('SCHOOL')
        
        console.log(`코드 생성 시도 ${attempts}: ${code}`)
        
        // 중복 확인
        const { data: existing, error: checkError } = await supabase
          .from('school_groups')
          .select('id')
          .eq('code', code)
          .maybeSingle()
        
        if (checkError) {
          // 테이블이 없는 경우 첫 번째 코드로 간주
          if (checkError.code === '42P01') {
            console.log('테이블 없음 - 첫 번째 코드로 진행')
            isUnique = true
            break
          }
          
          console.log('중복 확인 오류:', checkError)
          // 오류가 있어도 일단 진행
          isUnique = true
          break
        }
        
        if (!existing) {
          console.log('유니크한 코드 생성됨:', code)
          isUnique = true
        } else {
          console.log('코드 중복됨, 재시도...')
        }
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: '코드 생성에 실패했습니다. 직접 코드를 입력해주세요.' }, 
          { status: 500 }
        )
      }
    }

    // 학교 그룹 생성
    const newData = {
      code,
      name: group_name,
      description,
      school_name,
      creator_id: user.id,
      settings: {
        target_grade: target_grade || null,
        primary_subject: primary_subject || null
      }
    }

    console.log('데이터베이스에 삽입 시도...')
    const { data: newSchoolGroup, error: createError } = await supabase
      .from('school_groups')
      .insert([newData])
      .select()
      .single()

    if (createError) {
      console.error('학교 코드 생성 실패:', createError)
      
      if (createError.code === '42P01') {
        return NextResponse.json({ 
          error: '데이터베이스 테이블이 준비되지 않았습니다.',
          details: 'Supabase 마이그레이션을 실행해주세요.'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: '학교 코드 생성에 실패했습니다.',
        details: createError.message 
      }, { status: 500 })
    }

    console.log('학교 코드 생성 성공:', code)
    
    // 그룹 멤버십 추가
    await supabase
      .from('group_memberships')
      .insert({
        group_id: newSchoolGroup.id,
        user_id: user.id,
        role: 'admin'
      })
    
    return NextResponse.json({ success: true, data: newSchoolGroup }, { status: 201 })
    
  } catch (error: any) {
    console.error('학교 코드 POST 오류:', error)
    console.error('오류 스택:', error.stack)
    
    // 더 자세한 오류 정보 제공
    const errorMessage = '서버 오류가 발생했습니다.'
    let errorDetails = error.message
    
    if (error.code) {
      errorDetails += ` (Code: ${error.code})`
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}