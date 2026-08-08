export interface ChatMember { id: string; roomId: string; userId: string; displayName?: string | null; role: 'member' | 'admin'; joinedAt: string }
export interface ChatRoom { id: string; campusId: string; type: 'dm' | 'group' | 'community'; name: string | null; communityId: string | null; createdAt: string; members: ChatMember[] }
export interface ChatMessage { id: string; campusId: string; roomId: string; senderId: string; content: string | null; contentUnavailable?: boolean; createdAt: string; editedAt: string | null }
export interface ChatMessagePage { items: ChatMessage[]; nextCursor: string | null }
