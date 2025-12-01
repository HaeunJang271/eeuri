// 메모리 타입 정의
export interface MemoryItem {
  content: string
  weight: number
  lastUsed: string // ISO date string
  category: 'emotion' | 'interest' | 'goal' | 'characteristic'
}

export interface UserMemory {
  userId: string
  memories: MemoryItem[]
  updatedAt: string
}

// 메모리 가중치 관리
export function updateMemoryWeights(memories: MemoryItem[]): MemoryItem[] {
  const now = new Date()
  
  return memories.map(memory => {
    const daysSinceLastUsed = Math.floor(
      (now.getTime() - new Date(memory.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // 7일 이상 안 쓰이면 가중치 감소
    if (daysSinceLastUsed > 7) {
      memory.weight = Math.max(0, memory.weight - 0.5)
    }
    
    return memory
  }).filter(memory => memory.weight > 0) // 가중치가 0 이하면 제거
}

// 메모리 병합 (새로운 정보와 기존 메모리 통합)
export function mergeMemories(
  existing: MemoryItem[],
  newMemories: { content: string; category: MemoryItem['category'] }[]
): MemoryItem[] {
  const now = new Date().toISOString()
  const updated = [...existing]

  for (const newMemory of newMemories) {
    // 기존 메모리와 유사한 내용이 있는지 확인
    const similarIndex = updated.findIndex(
      m => m.content.includes(newMemory.content) || newMemory.content.includes(m.content)
    )

    if (similarIndex >= 0) {
      // 기존 메모리 강화
      updated[similarIndex].weight = Math.min(5, updated[similarIndex].weight + 1)
      updated[similarIndex].lastUsed = now
    } else {
      // 새로운 메모리 추가
      updated.push({
        content: newMemory.content,
        weight: 1,
        lastUsed: now,
        category: newMemory.category,
      })
    }
  }

  // 가중치 순으로 정렬하고 상위 3개만 유지
  return updated
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
}

// 메모리를 자연스러운 문장으로 변환
export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (memories.length === 0) {
    return ''
  }

  const formatted = memories.map(m => `- ${m.content}`).join('\n')
  
  return `[이으리의 기억]\n${formatted}\n\n이 기억들을 자연스럽게 대화에 녹여서 사용하되, 너무 자주 언급하지 않아. 사용자가 관련된 얘기를 할 때만 자연스럽게 꺼내서 사용해.`
}

