import { NextRequest, NextResponse } from 'next/server'
import { MemoryItem } from '@/lib/memory'
import { getMemory, saveMemory } from '@/lib/memory-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요해요' },
        { status: 400 }
      )
    }

    const userMemory = getMemory(userId)
    return NextResponse.json(userMemory)
  } catch (error) {
    console.error('Memory GET Error:', error)
    return NextResponse.json(
      { error: '메모리를 불러오는데 실패했어요' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, memories } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요해요' },
        { status: 400 }
      )
    }

    if (!memories || !Array.isArray(memories)) {
      return NextResponse.json(
        { error: 'memories 배열이 필요해요' },
        { status: 400 }
      )
    }

    saveMemory(userId, memories as MemoryItem[])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory POST Error:', error)
    return NextResponse.json(
      { error: '메모리를 저장하는데 실패했어요' },
      { status: 500 }
    )
  }
}

