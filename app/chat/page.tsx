"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
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

const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content:
    '안녕! 나는 이으리야. 네 길이 끊기지 않도록 옆에서 이어주는 존재야. 오늘 어떤 이야기를 나누고 싶어?\n\n💡 팁: 대화를 나눈 후 "/요약"이라고 입력하면 오늘 대화를 정리해줄게.',
};

// localStorage에서 메시지 불러오기
function loadMessages(userId: string): Message[] {
  if (typeof window === "undefined") return [DEFAULT_MESSAGE];
  
  try {
    const saved = localStorage.getItem(`eeuri_messages_${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
  return [DEFAULT_MESSAGE];
}

export default function ChatPage() {
  const [userId] = useState(() => getOrCreateUserId());
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 초기 로드 시 localStorage에서 메시지 불러오기
  useEffect(() => {
    if (userId) {
      const savedMessages = loadMessages(userId);
      setMessages(savedMessages);
    }
  }, [userId]);

  // 메시지 변경 시 localStorage에 저장
  useEffect(() => {
    if (userId && messages.length > 0) {
      localStorage.setItem(`eeuri_messages_${userId}`, JSON.stringify(messages));
    }
  }, [userId, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    // "/" 입력 시 자동완성 표시
    setShowAutocomplete(value === "/");
    
    // textarea 높이 자동 조절
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleAutocompleteClick = (command: string) => {
    setInput(command);
    setShowAutocomplete(false);
    // "/요약"인 경우 자동으로 요약 실행
    if (command === "/요약") {
      setTimeout(() => {
        handleSummarize();
        setInput(""); // 요약 실행 후 입력창 비우기
      }, 100);
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
      // 에러 메시지가 이미 이으리 말투인지 확인하고, 아니면 변환
      let errorMessage =
        err.message ||
        "요약하는 중에 뭔가 꼬인 것 같아. 잠시 뒤에 다시 해볼래?";
      // 서버에서 온 에러 메시지도 이으리 말투로 변환
      if (
        errorMessage.includes("서버 오류") ||
        errorMessage.includes("오류가 발생")
      ) {
        errorMessage =
          "요약하는 중에 뭔가 꼬인 것 같아. 잠시 뒤에 다시 해볼래?";
      } else if (
        errorMessage.includes("문제가 발생") ||
        errorMessage.includes("요약 중")
      ) {
        errorMessage =
          "요약하는 중에 뭔가 꼬인 것 같아. 잠시 뒤에 다시 해볼래?";
      }
      setSummaryError(errorMessage);
    } finally {
      setSummarizing(false);
    }
  }

  const handleResetConfirm = () => {
    // localStorage에서 메시지 삭제
    if (typeof window !== "undefined") {
      localStorage.removeItem(`eeuri_messages_${userId}`);
    }
    // 메시지를 기본 인사 메시지만 남기기
    setMessages([DEFAULT_MESSAGE]);
    // summary 초기화
    setSummary(null);
    setSummaryError(null);
    // 모달 닫기
    setShowResetModal(false);
  };

  const handleResetCancel = () => {
    setShowResetModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setShowAutocomplete(false);
    
    // textarea 높이 초기화
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

    // "/리셋" 명령어 처리 - 대화 초기화
    if (normalizedMessage === "/리셋" || normalizedMessage === "/reset") {
      setShowResetModal(true);
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

      if (!response.ok) {
        // 서버에서 온 에러 메시지가 있으면 그대로 사용 (이미 이으리 말투)
        const errorMessage =
          data?.error ||
          "지금은 내가 잘 연결이 안 되는 것 같아… 잠깐 뒤에 다시 시도해볼래?";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMessage },
        ]);
        return;
      }

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
          content:
            "지금은 내가 잘 연결이 안 되는 것 같아… 잠깐 뒤에 다시 시도해볼래?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className={styles.messageContent}>
              {message.role === "assistant" ? (
                <div className={styles.markdown}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typing}>이으리가 생각 중..</span>
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
        {showAutocomplete && (
          <div className={styles.autocomplete}>
            <button
              type="button"
              onClick={() => handleAutocompleteClick("/요약")}
              className={styles.autocompleteItem}
            >
              <span className={styles.autocompleteCommand}>/요약</span>
              <span className={styles.autocompleteDesc}>
                오늘 대화 요약하기
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleAutocompleteClick("/리셋")}
              className={styles.autocompleteItem}
            >
              <span className={styles.autocompleteCommand}>/리셋</span>
              <span className={styles.autocompleteDesc}>대화 초기화하기</span>
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
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
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || summarizing || !input.trim()}
            className={styles.sendButton}
          >
            전송
          </button>
        </div>
      </form>

      {/* 리셋 확인 모달 */}
      {showResetModal && (
        <div className={styles.modalOverlay} onClick={handleResetCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>대화 초기화</h2>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalMessage}>
                다시 처음부터 이야기해볼까?
              </p>
              <p className={styles.modalSubMessage}>
                지금까지 나눈 대화가 모두 삭제돼요.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleResetCancel}
                className={styles.modalButtonCancel}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className={styles.modalButtonConfirm}
              >
                초기화하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
