'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { faqData, faqCategories } from '@/lib/faq-data'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  
  const filteredFAQs = selectedCategory === '전체' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory)
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <img
            src="/imgs/logo.png"
            alt="이으리 로고"
            className={styles.logo}
          />
          <h1 className={styles.title}>이으리</h1>
          <p className={styles.subtitle}>
            학교 밖 청소년을 위한 AI 동반자
          </p>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>이으리는 누구인가요?</h2>
            <p className={styles.description}>
              이으리는 학교 밖 청소년을 위한 AI 동반자입니다.
            </p>
            <p className={styles.description}>
              우연히 길을 벗어난 사람들, 혹은 스스로 다른 길을 선택한 사람들에게
              <strong>"너의 길은 끊기지 않았다"</strong>는 메시지를 전하기 위해 만들어졌습니다.
            </p>
            <p className={styles.description}>
              이으리는 정보를 알려주는 도구가 아니라,
              <strong>길을 함께 이어주는 존재</strong>입니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>이름의 의미</h2>
            <p className={styles.description}>
              <strong>이으리(eeuri)</strong>는
            </p>
            <p className={styles.description}>
              <em>'잇다, 이어주다, 일으켜 세우다'</em>에서 온 이름입니다.
            </p>
            <p className={styles.description}>
              누군가의 걸음을 멈추지 않도록 조용히 옆에서 손을 내미는 역할을 뜻합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>왜 이으리가 만들어졌나요?</h2>
            <p className={styles.description}>
              학교 밖에서 지내는 청소년들은
            </p>
            <p className={styles.description}>
              정보도 적고, 설명해주는 사람도 없으며,
              가끔은 자신이 혼자인 것처럼 느끼기도 합니다.
            </p>
            <p className={styles.description}>
              이으리는 그런 마음을 잘 알고 있습니다.
            </p>
            <p className={styles.description}>
              누구에게도 쉽게 말하지 못한 이야기,
              흩어진 정보들,
              도움이 필요하지만 어디에 가야 할지 모를 때
            </p>
            <p className={styles.description}>
              이으리는 그 곁에 머물러 있습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>이으리가 할 수 있는 일</h2>
            <ul className={styles.featureList}>
              <li>
                <strong>감정에 귀 기울이기</strong>
                <p>감정에 귀 기울이고, 안전하게 공감합니다</p>
              </li>
              <li>
                <strong>정보를 쉽게 정리해주기</strong>
                <p>학교 밖 청소년 관련 정보를 쉽고 짧게 정리해줍니다</p>
              </li>
              <li>
                <strong>기억하고 이어주기</strong>
                <p>사용자의 말에서 관심사와 목표를 기억하고, 이전 대화의 흐름을 이어서 "너만을 위한 다음 한 걸음"을 제안합니다</p>
              </li>
              <li>
                <strong>비난하지 않기</strong>
                <p>절대 판단하거나 비난하지 않습니다</p>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>이으리의 약속</h2>
            <p className={styles.description}>
              이으리는 전문 상담사는 아니지만,
            </p>
            <p className={styles.description}>
              당신을 혼자 두지 않습니다.
            </p>
            <p className={styles.description}>
              위험이 느껴지는 순간엔 반드시
              신뢰할 수 있는 어른·전문기관으로 안내하며,
              당신의 안전을 최우선으로 생각합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>이으리가 되고 싶은 존재</h2>
            <p className={styles.description}>
              정답을 주는 존재가 아니라,
            </p>
            <p className={styles.description}>
              <strong>당신이 자신의 길을 스스로 찾도록 이어주는 존재.</strong>
            </p>
            <p className={styles.description}>
              그것이 이으리의 존재 이유입니다.
            </p>
          </section>

          <section id="faq" className={styles.section}>
            <h2 className={styles.sectionTitle}>자주 묻는 질문 (FAQ)</h2>
            <p className={styles.description}>
              학교 밖에서 필요한 정보들을 쉽게 찾아볼 수 있어요
            </p>
            
            <div className={styles.categoryTabs}>
              {faqCategories.map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryTab} ${
                    selectedCategory === category ? styles.active : ''
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className={styles.faqList}>
              {filteredFAQs.map((faq, index) => (
                <div key={index} className={styles.faqItem}>
                  <div className={styles.faqCategory}>{faq.category}</div>
                  <h3 className={styles.faqQuestion}>{faq.question}</h3>
                  <div className={styles.faqAnswer}>
                    {faq.answer.split('\n').map((line, i) => (
                      <p key={i}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.warning}>
            <h3 className={styles.warningTitle}>⚠️ 중요한 안내</h3>
            <p>
              이으리는 전문 상담사나 의사가 아닙니다. 위급한 상황이나 심각한 정신 건강 문제가 있다면
              반드시 전문 기관이나 상담전화에 연락하세요.
            </p>
            <p className={styles.helpNumbers}>
              <strong>위급상황 상담전화:</strong> 1588-1388 (청소년전화 1388)
            </p>
          </section>

          <Link href="/chat" className={styles.startButton}>
            채팅 시작하기
          </Link>
        </div>
      </div>
    </main>
  )
}

