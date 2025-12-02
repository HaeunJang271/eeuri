"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Summary = {
  topic: string;
  emotion: string;
  message: string;
  action: string;
};

// userId 생성/불러오기
function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  let userId = localStorage.getItem("eeuri_userId");
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("eeuri_userId", userId);
  }
  return userId;
}

// LocalStorage에서 메시지 불러오기
function loadMessagesFromStorage(userId: string): Message[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(`eeuri_messages_${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 유효한 메시지 배열인지 확인
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load messages from storage:", error);
  }

  // 기본 인사 메시지
  return [
    {
      role: "assistant",
      content:
        '안녕! 나는 이으리야. 네 길이 끊기지 않도록 옆에서 이어주는 존재야. 오늘 어떤 이야기를 나누고 싶어?\n\n💡 팁: 대화를 나눈 후 "/요약"이라고 입력하면 오늘 대화를 정리해줄게.',
    },
  ];
}

// LocalStorage에 메시지 저장
function saveMessagesToStorage(userId: string, messages: Message[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`eeuri_messages_${userId}`, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save messages to storage:", error);
  }
}

// 기본 인사 메시지
const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content:
    '안녕! 나는 이으리야. 네 길이 끊기지 않도록 옆에서 이어주는 존재야. 오늘 어떤 이야기를 나누고 싶어?\n\n💡 팁: 대화를 나눈 후 "/요약"이라고 입력하면 오늘 대화를 정리해줄게.',
};

export default function ChatPage() {
  const [userId] = useState(() => getOrCreateUserId());
  // 초기 상태는 빈 배열로 시작 (서버와 클라이언트 일치)
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 클라이언트에서만 LocalStorage에서 메시지 불러오기
  useEffect(() => {
    if (!isLoaded) {
      const loadedMessages = loadMessagesFromStorage(userId);
      setMessages(loadedMessages);
      setIsLoaded(true);
    }
  }, [userId, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      scrollToBottom();
    }
  }, [messages, isLoaded]);

  // 메시지가 변경될 때마다 LocalStorage에 저장 (로드 완료 후에만)
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      saveMessagesToStorage(userId, messages);
    }
  }, [messages, userId, isLoaded]);

  // 페이지를 떠날 때 대화 요약 저장
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // 사용자 메시지가 2개 이상일 때만 요약 (실제 대화가 있었을 때)
      const userMessages = messages.filter((m) => m.role === "user");
      if (userMessages.length >= 2) {
        try {
          await fetch("/api/memory/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, messages }),
          });
        } catch (error) {
          console.error("Failed to save memory:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // 컴포넌트 언마운트 시에도 저장
      handleBeforeUnload();
    };
  }, [userId, messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    // "/" 입력 시 자동완성 표시
    setShowAutocomplete(value === "/");
  };

  const handleAutocompleteClick = () => {
    setInput("/요약");
    setShowAutocomplete(false);
    // 자동으로 요약 실행
    setTimeout(() => {
      handleSummarize();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || summarizing) return;

    const userMessage = input.trim();
    setInput("");
    setShowAutocomplete(false);

    // "/요약" 명령어 처리 - 메시지 목록에 추가하지 않고 바로 요약 실행
    const normalizedMessage = userMessage.toLowerCase().replace(/\s+/g, "");
    if (
      normalizedMessage === "/요약" ||
      normalizedMessage === "/요약해줘" ||
      normalizedMessage.startsWith("/요약")
    ) {
      await handleSummarize();
      return; // 메시지 목록에 추가하지 않음
    }

    // 일반 메시지는 메시지 목록에 추가
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/eeuri", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("응답을 받아오는데 실패했어요");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "죄송해요, 잠시 문제가 생긴 것 같아요. 다시 시도해볼까요?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  async function handleSummarize() {
    if (!userId) return;

    // 사용자 메시지가 없거나 기본 인사 메시지만 있는 경우
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) {
      setSummary({
        topic: "아직 대화를 나누지 않았어요",
        emotion: "대화를 시작하면 감정 상태를 함께 정리해줄게요",
        message:
          "먼저 이으리와 이야기를 나눠보면 좋을 것 같아요. 어떤 고민이든 편하게 말해줘.",
        action: "이으리에게 오늘의 기분이나 고민을 한 마디로 말해보기",
      });
      return;
    }

    setSummarizing(true);
    setSummaryError(null);

    try {
      const payloadMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "요약 중 문제가 발생했어.");
      }

      const data = await res.json();
      setSummary(data.summary as Summary);
    } catch (err: any) {
      console.error("Summarize error:", err);
      setSummaryError(
        err.message || "요약 도중 오류가 발생했어. 잠시 후 다시 시도해줘."
      );
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 홈으로
        </Link>
        <div className={styles.headerContent}>
          <img src="/imgs/logo.png" alt="이으리 로고" className={styles.logo} />
          <h1 className={styles.title}>이으리와 대화하기</h1>
        </div>
        <div className={styles.helpNotice}>
          위급한 상황일 땐 <strong>1588-1388</strong> (청소년전화 1388) 또는
          지역 상담전화에 연락해요
        </div>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageContent}>{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typing}>이으리가 생각 중...</span>
            </div>
          </div>
        )}
        {summarizing && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              오늘 이으리와 나눈 이야기 정리
            </div>
            <div className={styles.summarySkeleton}>
              <div className={styles.skeletonItem}>
                <div className={styles.skeletonLabel}></div>
                <div className={styles.skeletonContent}></div>
              </div>
              <div className={styles.skeletonItem}>
                <div className={styles.skeletonLabel}></div>
                <div className={styles.skeletonContent}></div>
              </div>
              <div className={styles.skeletonItem}>
                <div className={styles.skeletonLabel}></div>
                <div className={styles.skeletonContent}></div>
              </div>
              <div className={styles.skeletonItem}>
                <div className={styles.skeletonLabel}></div>
                <div className={styles.skeletonContent}></div>
              </div>
            </div>
          </div>
        )}
        {summary && !summarizing && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              오늘 이으리와 나눈 이야기 정리
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>1) 오늘의 고민 / 주제</div>
              <div className={styles.summaryContent}>
                {summary.topic || "요약이 잘 안 됐어."}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>2) 지금 감정 상태</div>
              <div className={styles.summaryContent}>
                {summary.emotion || "감정 요약이 비어 있어."}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>
                3) 이으리가 전하고 싶은 한 문장
              </div>
              <div className={styles.summaryMessage}>
                {summary.message ||
                  "너에게 전하고 싶은 말을 잘 정리하지 못했어."}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>
                4) 내일 해보면 좋을 아주 작은 한 가지
              </div>
              <div className={styles.summaryContent}>
                {summary.action || "내일 해볼 행동이 잘 정리되지 않았어."}
              </div>
            </div>
          </div>
        )}
        {summaryError && (
          <div className={styles.summaryError}>{summaryError}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            onFocus={() => {
              if (input === "/") {
                setShowAutocomplete(true);
              }
            }}
            placeholder="메시지를 입력하세요..."
            className={styles.input}
            disabled={isLoading || summarizing}
          />
          {showAutocomplete && (
            <div className={styles.autocomplete}>
              <button
                type="button"
                onClick={handleAutocompleteClick}
                className={styles.autocompleteItem}
              >
                <span className={styles.autocompleteCommand}>/요약</span>
                <span className={styles.autocompleteDesc}>
                  오늘 대화 요약하기
                </span>
              </button>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || summarizing || !input.trim()}
          className={styles.sendButton}
        >
          전송
        </button>
      </form>
    </div>
  );
}
