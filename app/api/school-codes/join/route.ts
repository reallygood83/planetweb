import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST: 학교 코드 참여
export async function POST(request: NextRequest) {
  try {
    // Service Role 클라이언트 사용
    const serviceSupabase = await createServiceClient()
    
    // 현재 사용자 확인 (인증용)
    const tempSupabase = await createClient()
    const { data: { user }, error: authError } = await tempSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    // 필수 필드 검증
    if (!code || code.length < 4 || code.length > 10) {
      return NextResponse.json(
        { error: 'Valid 4-10 character code is required' }, 
        { status: 400 }
      )
    }

    // 학교 그룹 확인
    const { data: schoolGroup, error: fetchError } = await serviceSupabase
      .from('school_groups')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (fetchError || !schoolGroup) {
      return NextResponse.json(
        { error: 'Invalid school code' }, 
        { status: 404 }
      )
    }

    // 이미 멤버인지 확인
    const { data: existingMembership } = await serviceSupabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', schoolGroup.id)
      .eq('user_id', user.id)
      .single()
    
    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this group' }, 
        { status: 400 }
      )
    }

    // 멤버 추가
    const { data: membership, error: updateError } = await serviceSupabase
      .from('group_memberships')
      .insert({
        group_id: schoolGroup.id,
        user_id: user.id,
        role: 'member'
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating school code:', updateError)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: { ...schoolGroup, membership },
      message: `Successfully joined ${schoolGroup.name}`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}