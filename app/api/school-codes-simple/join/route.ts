import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service Role 클라이언트 생성 (RLS 완전 우회)
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

// POST: 학교 코드 참여 (단순화된 방식)
export async function POST(request: NextRequest) {
  try {
    console.log('=== 단순 학교 코드 참여 시작 ===')
    
    // 요청 데이터 파싱
    const body = await request.json()
    const { code } = body
    
    console.log('참여 요청 코드:', code)
    
    // 필수 필드 검증
    if (!code || code.length < 4 || code.length > 10) {
      return NextResponse.json(
        { error: 'Valid 4-10 character code is required' }, 
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
    
    // 학교 그룹 확인
    const { data: schoolGroup, error: fetchError } = await serviceClient
      .from('school_groups')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()
    
    if (fetchError || !schoolGroup) {
      console.log('학교 그룹 조회 오류:', fetchError?.message)
      return NextResponse.json(
        { error: 'Invalid school code' }, 
        { status: 404 }
      )
    }
    
    console.log('학교 그룹 확인됨:', schoolGroup.name)
    
    // 이미 생성자인지 확인
    if (schoolGroup.creator_id === user.id) {
      return NextResponse.json(
        { error: 'You are the creator of this group' }, 
        { status: 400 }
      )
    }
    
    // 멤버십 정보를 school_groups 테이블에 직접 저장하는 방식으로 변경
    // members 배열에 사용자 정보 추가
    const currentMembers = schoolGroup.members || []
    
    // 이미 멤버인지 확인
    const isAlreadyMember = currentMembers.some((member: any) => 
      member.user_id === user.id
    )
    
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: 'You are already a member of this group' }, 
        { status: 400 }
      )
    }
    
    // 새 멤버 추가
    const newMember = {
      user_id: user.id,
      email: user.email,
      role: 'member',
      joined_at: new Date().toISOString()
    }
    
    const updatedMembers = [...currentMembers, newMember]
    
    console.log('멤버 추가 중...')
    
    // 학교 그룹의 members 배열 업데이트
    const { data: updatedGroup, error: updateError } = await serviceClient
      .from('school_groups')
      .update({ 
        members: updatedMembers,
        updated_at: new Date().toISOString()
      })
      .eq('id', schoolGroup.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('멤버 추가 오류:', updateError)
      return NextResponse.json({ 
        error: 'Failed to join group',
        details: updateError.message 
      }, { status: 500 })
    }
    
    console.log('멤버 추가 성공')
    
    return NextResponse.json({ 
      success: true, 
      data: { ...updatedGroup, role: 'member' },
      message: `Successfully joined ${schoolGroup.name}`
    })
    
  } catch (error: any) {
    console.error('학교 코드 참여 오류:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}