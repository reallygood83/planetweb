import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const supabase = await createClient()

    const { data: survey, error } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        questions,
        is_active,
        created_at,
        evaluation_plans (
          id,
          subject,
          grade,
          semester
        )
      `)
      .eq('id', surveyId)
      .eq('is_active', true)
      .single()

    if (error || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Error fetching survey:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}