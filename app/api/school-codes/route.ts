import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자가 참여한 학교 코드 목록 조회
export async function GET() {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured, returning empty data')
      return NextResponse.json({ success: true, data: [] })
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
      console.error('Error fetching school codes:', error)
      // 테이블이 없는 경우 빈 배열 반환
      if (error.message?.includes('relation') || error.message?.includes('table')) {
        return NextResponse.json({ success: true, data: [] })
      }
      return NextResponse.json({ error: 'Failed to fetch school codes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: schoolCodes || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: true, data: [] }) // 폴백으로 빈 배열 반환
  }
}

// POST: 새로운 학교 코드 생성
export async function POST(request: NextRequest) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not configured. Please contact administrator.' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { group_name, description, school_name, target_grade, primary_subject } = body

    // 필수 필드 검증
    if (!group_name || !description || !school_name) {
      return NextResponse.json(
        { error: 'group_name, description, and school_name are required' }, 
        { status: 400 }
      )
    }

    // 6자리 영숫자 코드 생성
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    // 고유한 코드 생성 (중복 체크)
    let code = ''
    let isUnique = false
    let attempts = 0
    
    while (!isUnique && attempts < 10) {
      code = generateCode()
      
      const { data: existing } = await supabase
        .from('school_codes')
        .select('code')
        .eq('code', code)
        .single()
      
      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique code' }, 
        { status: 500 }
      )
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
      console.error('Error creating school code:', createError)
      return NextResponse.json({ error: 'Failed to create school code' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newSchoolCode }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}