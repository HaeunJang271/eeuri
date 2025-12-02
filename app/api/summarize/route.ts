import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages 배열이 필요해요." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았어요" },
        { status: 500 }
      );
    }

    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "사용자" : "이으리"}: ${m.content}`)
      .join("\n");

    const prompt = `너는 "이으리"와 학교 밖 청소년의 대화를 요약해 주는 조력자야.

아래 대화를 읽고, 다음 네 가지 정보를 JSON 형식으로 만들어줘.

1) topic: 오늘 사용자가 주로 이야기한 고민/주제 (짧게 한 문장)

2) emotion: 사용자의 현재 감정 상태를 한 문장으로 요약

3) message: 이으리가 지금 사용자에게 전해주고 싶은 한 문장 메시지

4) action: 사용자가 내일 해볼 수 있는 아주 작은 한 가지 행동

형식은 반드시 아래 예시처럼 JSON으로만 답해줘. 다른 말은 쓰지 마.

{
  "topic": "...",
  "emotion": "...",
  "message": "...",
  "action": "..."
}

대화:

${conversationText}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "너는 이으리 대화를 정리해주는 요약 도우미야. JSON 형식으로만 응답하세요." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "";

    let summary = {
      topic: "",
      emotion: "",
      message: "",
      action: "",
    };

    try {
      const parsed = JSON.parse(raw);
      summary.topic = parsed.topic ?? "";
      summary.emotion = parsed.emotion ?? "";
      summary.message = parsed.message ?? "";
      summary.action = parsed.action ?? "";
    } catch (e) {
      // JSON 파싱 실패하면 그냥 전체를 message로 취급
      summary.message = raw || "요약을 생성하지 못했어.";
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: "요약 중 서버 오류가 발생했어요." },
      { status: 500 }
    );
  }
}

