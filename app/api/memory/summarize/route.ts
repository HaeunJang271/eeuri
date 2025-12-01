import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { mergeMemories, updateMemoryWeights } from '@/lib/memory'
import { getMemory, saveMemory } from '@/lib/memory-store'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId, messages } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId가 필요해요' },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages 배열이 필요해요' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았어요' },
        { status: 500 }
      )
    }

    // 기존 메모리 불러오기
    const existingMemory = getMemory(userId)
    const existingMemories = existingMemory.memories || []

    // 대화 요약 생성
    const summaryPrompt = `다음 대화를 분석해서, 장기적으로 기억할 만한 정보만 1~3개 추려줘.

기억할 정보의 종류:
- 감정/상태: 반복적으로 나타나는 감정이나 상태 (예: "불안감을 자주 느낌", "의욕이 없을 때가 많음")
- 관심사: 지속적인 관심사나 취미 (예: "창작 활동을 좋아함", "개발에 관심 있음")
- 목표: 장기적인 목표나 계획 (예: "스스로 루틴 만들고 싶어함", "검정고시 준비 중")
- 특성: 사용자의 성향이나 특성 (예: "자유로운 방식의 공부 선호", "작은 작업으로 감 잡는 방식 선호")

대화 내용:
${messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n')}

응답 형식은 JSON으로:
{
  "memories": [
    {
      "content": "기억할 내용을 자연스러운 문장으로 (예: '너는 자유로운 방식의 공부가 맞는 편이라고 했었지')",
      "category": "emotion" | "interest" | "goal" | "characteristic"
    }
  ]
}

중요: 
- 정말 중요한 것만 1~3개만 추려줘
- 개인정보나 구체적인 세부사항은 제외하고 의미만 추출해줘
- 자연스러운 문장으로 작성해줘`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 대화를 분석해서 중요한 정보만 추출하는 전문가입니다. JSON 형식으로만 응답하세요.' },
        { role: 'user', content: summaryPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const summaryText = completion.choices[0]?.message?.content || '{}'
    const summary = JSON.parse(summaryText)

    // 기존 메모리와 병합
    const updatedMemories = mergeMemories(
      updateMemoryWeights(existingMemories),
      summary.memories || []
    )

    // 메모리 저장
    saveMemory(userId, updatedMemories)

    return NextResponse.json({
      success: true,
      memories: updatedMemories,
    })
  } catch (error) {
    console.error('Summarize Error:', error)
    return NextResponse.json(
      { error: '대화를 요약하는데 실패했어요' },
      { status: 500 }
    )
  }
}

