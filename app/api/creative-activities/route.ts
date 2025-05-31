import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('classId')
    const semester = searchParams.get('semester')

    let query = supabase
      .from('creative_activities')
      .select('*')
      .eq('user_id', user.id)

    if (classId && classId !== 'temp-id') {
      query = query.eq('class_id', classId)
    }

    if (semester) {
      query = query.eq('semester', semester)
    }

    const { data: activities, error } = await query
      .order('order_number', { ascending: true })

    if (error) {
      console.error('Error fetching creative activities:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: activities })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classId, activities, semester } = body

    if (!classId || !activities || !semester || classId === 'temp-id') {
      return NextResponse.json({ 
        error: 'Valid class ID required' 
      }, { status: 400 })
    }

    // 기존 활동 삭제 (같은 학급, 같은 학기)
    const { error: deleteError } = await supabase
      .from('creative_activities')
      .delete()
      .eq('class_id', classId)
      .eq('semester', semester)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting existing activities:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to update activities' 
      }, { status: 500 })
    }

    // 새 활동 삽입
    const activitiesToInsert = activities.map((activity: any) => ({
      user_id: user.id,
      class_id: classId,
      semester,
      order_number: activity.orderNumber,
      activity_date: activity.date,
      activity_name: activity.name,
      activity_area: activity.area
    }))

    const { data: insertedActivities, error: insertError } = await supabase
      .from('creative_activities')
      .insert(activitiesToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting activities:', insertError)
      return NextResponse.json({ 
        error: 'Failed to save activities' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedActivities,
      message: `${insertedActivities.length}개의 활동이 저장되었습니다.`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'Activity ID is required' 
      }, { status: 400 })
    }

    // 데이터 변환
    const dbUpdateData: any = {}
    if (updateData.orderNumber !== undefined) dbUpdateData.order_number = updateData.orderNumber
    if (updateData.date !== undefined) dbUpdateData.activity_date = updateData.date
    if (updateData.name !== undefined) dbUpdateData.activity_name = updateData.name
    if (updateData.area !== undefined) dbUpdateData.activity_area = updateData.area

    const { data: updatedActivity, error } = await supabase
      .from('creative_activities')
      .update(dbUpdateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating activity:', error)
      return NextResponse.json({ 
        error: 'Failed to update activity' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedActivity 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        error: 'Activity ID is required' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('creative_activities')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting activity:', error)
      return NextResponse.json({ 
        error: 'Failed to delete activity' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '활동이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}