import { UserMemory, MemoryItem } from './memory'

// 간단한 인메모리 저장소 (나중에 Firebase로 교체 가능)
export const memoryStore = new Map<string, UserMemory>()

export function getMemory(userId: string): UserMemory {
  return memoryStore.get(userId) || {
    userId,
    memories: [],
    updatedAt: new Date().toISOString(),
  }
}

export function saveMemory(userId: string, memories: MemoryItem[]): void {
  memoryStore.set(userId, {
    userId,
    memories,
    updatedAt: new Date().toISOString(),
  })
}

