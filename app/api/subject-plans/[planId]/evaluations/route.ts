import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: 특정 과목 평가계획에 개별 평가 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 평가계획 소유권 확인
    const { data: plan, error: planError } = await supabase
      .from('subject_evaluation_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found or unauthorized' }, { status: 404 })
    }

    const body = await request.json()
    const {
      evaluation_name,
      unit,
      lesson,
      evaluation_period,
      achievement_standards,
      evaluation_methods,
      evaluation_tools,
      evaluation_criteria,
      weight
    } = body

    // 필수 필드 검증
    if (!evaluation_name || !unit) {
      return NextResponse.json(
        { error: 'evaluation_name and unit are required' }, 
        { status: 400 }
      )
    }

    // 성취기준 검증
    if (!achievement_standards || achievement_standards.length === 0) {
      return NextResponse.json(
        { error: 'At least one achievement standard is required' }, 
        { status: 400 }
      )
    }

    // 평가방법 및 도구 검증
    if (!evaluation_methods || evaluation_methods.length === 0) {
      return NextResponse.json(
        { error: 'At least one evaluation method is required' }, 
        { status: 400 }
      )
    }

    if (!evaluation_tools || evaluation_tools.length === 0) {
      return NextResponse.json(
        { error: 'At least one evaluation tool is required' }, 
        { status: 400 }
      )
    }

    // 평가기준 검증
    if (!evaluation_criteria || 
        !evaluation_criteria.excellent?.description ||
        !evaluation_criteria.good?.description ||
        !evaluation_criteria.satisfactory?.description ||
        !evaluation_criteria.needs_improvement?.description) {
      return NextResponse.json(
        { error: 'All evaluation criteria descriptions are required' }, 
        { status: 400 }
      )
    }

    // 새 개별 평가 생성
    const { data: newEvaluation, error } = await supabase
      .from('individual_evaluations')
      .insert([{
        plan_id: planId,
        evaluation_name,
        unit,
        lesson,
        evaluation_period,
        achievement_standards,
        evaluation_methods,
        evaluation_tools,
        evaluation_criteria,
        weight: weight || 100
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating evaluation:', error)
      return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newEvaluation }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}