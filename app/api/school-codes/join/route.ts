import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: 학교 코드 참여
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    // 필수 필드 검증
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Valid 6-character code is required' }, 
        { status: 400 }
      )
    }

    // 학교 코드 확인
    const { data: schoolCode, error: fetchError } = await supabase
      .from('school_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (fetchError || !schoolCode) {
      return NextResponse.json(
        { error: 'Invalid school code' }, 
        { status: 404 }
      )
    }

    // 이미 멤버인지 확인
    if (schoolCode.members && schoolCode.members.includes(user.email)) {
      return NextResponse.json(
        { error: 'You are already a member of this group' }, 
        { status: 400 }
      )
    }

    // 멤버 추가
    const updatedMembers = [...(schoolCode.members || []), user.email]
    
    const { data: updatedSchoolCode, error: updateError } = await supabase
      .from('school_codes')
      .update({ 
        members: updatedMembers,
        updated_at: new Date().toISOString()
      })
      .eq('id', schoolCode.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating school code:', updateError)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedSchoolCode,
      message: `Successfully joined ${schoolCode.group_name}`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}