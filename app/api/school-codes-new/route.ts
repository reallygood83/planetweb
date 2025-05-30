import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service Role 클라이언트 생성 (RLS 우회)
async function createServiceRoleClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  )
}

// 일반 클라이언트 생성 (인증용)
async function createAuthClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  )
}

// 간단한 코드 생성 함수
function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'S' // 학교 코드는 S로 시작
  
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  
  return code
}

// GET: 사용자가 참여한 학교 코드 목록 조회
export async function GET() {
  try {
    console.log('=== 새로운 학교 코드 조회 시작 ===')
    
    // 인증 확인
    const authClient = await createAuthClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      console.log('인증 실패:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('사용자 인증 성공:', user.email)
    
    // Service Role 클라이언트로 데이터 조회
    const serviceClient = await createServiceRoleClient()
    
    // 1. 사용자가 생성한 그룹들 조회
    const { data: createdGroups, error: createdError } = await serviceClient
      .from('school_groups')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
    
    if (createdError) {
      console.error('생성한 그룹 조회 오류:', createdError)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        details: createdError.message 
      }, { status: 500 })
    }
    
    // 2. 사용자가 참여한 그룹들 조회 (멤버십 테이블에서)
    const { data: memberships, error: membershipError } = await serviceClient
      .from('group_memberships')
      .select(`
        group_id,
        school_groups!inner(*)
      `)
      .eq('user_id', user.id)
    
    let joinedGroups: any[] = []
    if (membershipError) {
      console.log('멤버십 조회 오류 (무시):', membershipError.message)
    } else if (memberships) {
      joinedGroups = memberships.map(m => (m as any).school_groups).filter(Boolean)
    }
    
    // 3. 중복 제거하여 통합
    const allGroupsMap = new Map()
    
    // 생성한 그룹들 추가
    if (createdGroups) {
      createdGroups.forEach(group => {
        allGroupsMap.set(group.id, { ...group, role: 'creator' })
      })
    }
    
    // 참여한 그룹들 추가
    joinedGroups.forEach(group => {
      if (!allGroupsMap.has(group.id)) {
        allGroupsMap.set(group.id, { ...group, role: 'member' })
      }
    })
    
    const allGroups = Array.from(allGroupsMap.values())
    
    console.log('학교 코드 조회 성공:', allGroups.length, '개')
    return NextResponse.json({ 
      success: true, 
      data: allGroups 
    })
    
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
    console.log('=== 새로운 학교 코드 생성 시작 ===')
    
    // 요청 데이터 파싱
    const body = await request.json()
    const { code: manualCode, group_name, description, school_name, target_grade, primary_subject } = body
    
    console.log('요청 데이터:', { manualCode, group_name, school_name })
    
    // 필수 필드 검증
    if (!group_name || !description || !school_name) {
      return NextResponse.json(
        { error: '그룹명, 설명, 학교명은 필수입니다.' }, 
        { status: 400 }
      )
    }
    
    // 인증 확인
    const authClient = await createAuthClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      console.log('인증 실패:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('사용자 인증 성공:', user.email)
    
    // Service Role 클라이언트로 데이터 처리
    const serviceClient = await createServiceRoleClient()
    
    let finalCode = ''
    
    // 코드 결정 (수동 입력 또는 자동 생성)
    if (manualCode) {
      // 수동 입력 코드 검증
      const codePattern = /^[A-Z0-9]{4,10}$/
      if (!codePattern.test(manualCode.toUpperCase())) {
        return NextResponse.json({ 
          error: '코드는 4-10자의 영문 대문자와 숫자로만 구성되어야 합니다.' 
        }, { status: 400 })
      }
      
      finalCode = manualCode.toUpperCase()
      
      // 중복 검사
      const { data: existing } = await serviceClient
        .from('school_groups')
        .select('id')
        .eq('code', finalCode)
        .single()
      
      if (existing) {
        return NextResponse.json({ 
          error: '이미 사용 중인 코드입니다. 다른 코드를 입력해주세요.' 
        }, { status: 400 })
      }
      
      console.log('수동 코드 사용:', finalCode)
    } else {
      // 자동 코드 생성 (최대 20번 시도)
      let attempts = 0
      let isUnique = false
      
      while (attempts < 20 && !isUnique) {
        attempts++
        finalCode = generateSchoolCode()
        
        console.log(`코드 생성 시도 ${attempts}: ${finalCode}`)
        
        const { data: existing } = await serviceClient
          .from('school_groups')
          .select('id')
          .eq('code', finalCode)
          .single()
        
        if (!existing) {
          isUnique = true
          console.log('유니크한 코드 생성됨:', finalCode)
        }
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: '코드 생성에 실패했습니다. 수동으로 코드를 입력해주세요.' }, 
          { status: 500 }
        )
      }
    }
    
    // 학교 그룹 생성
    const newGroupData = {
      code: finalCode,
      name: group_name,
      description,
      school_name,
      creator_id: user.id,
      settings: {
        target_grade: target_grade || null,
        primary_subject: primary_subject || null
      }
    }
    
    console.log('학교 그룹 생성 중...', finalCode)
    const { data: newGroup, error: createError } = await serviceClient
      .from('school_groups')
      .insert([newGroupData])
      .select()
      .single()
    
    if (createError) {
      console.error('학교 그룹 생성 오류:', createError)
      return NextResponse.json({ 
        error: '학교 코드 생성에 실패했습니다.',
        details: createError.message 
      }, { status: 500 })
    }
    
    console.log('학교 그룹 생성 성공:', newGroup.id)
    
    // 멤버십 추가 (생성자는 admin)
    try {
      const { error: membershipError } = await serviceClient
        .from('group_memberships')
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
          role: 'admin'
        })
      
      if (membershipError) {
        console.error('멤버십 추가 오류:', membershipError)
        // 멤버십 추가 실패해도 그룹 생성은 성공으로 처리
      } else {
        console.log('멤버십 추가 성공')
      }
    } catch (membershipErr) {
      console.error('멤버십 추가 예외:', membershipErr)
    }
    
    return NextResponse.json({ 
      success: true, 
      data: newGroup 
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('학교 코드 POST 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    }, { status: 500 })
  }
}