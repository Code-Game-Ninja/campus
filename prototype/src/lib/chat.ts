export type ChatRoomType = 'dm' | 'team' | 'group' | 'event';
export type ChatMessageType = 'text' | 'file' | 'link' | 'gif' | 'sticker' | 'system';
export interface ChatMember {
  id: string;
  roomId: string;
  userId: string;
  displayName?: string | null;
  role: 'member' | 'admin' | 'owner';
  joinedAt: string;
  leftAt?: string | null;
  lastReadAt?: string | null;
}
export interface ChatRoom {
  id: string;
  campusId: string | null;
  type: ChatRoomType;
  name: string | null;
  communityId?: string | null;
  teamRequestId?: string | null;
  eventId?: string | null;
  createdAt: string;
  updatedAt?: string;
  lastMessagePreview?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  members: ChatMember[];
}
export interface ChatMessage {
  id: string;
  campusId: string | null;
  roomId: string;
  senderId: string;
  clientMessageId?: string;
  content: string | null;
  messageType?: ChatMessageType;
  linkUrl?: string | null;
  replyToMessageId?: string | null;
  metadata?: Record<string, unknown>;
  status?: 'visible' | 'deleted' | 'removed';
  contentUnavailable?: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt?: string | null;
}
export interface ChatMessagePage { items: ChatMessage[]; nextCursor: string | null }

export interface ChatAttachment {
  id: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  storageKey: string;
  scanStatus: 'pending' | 'clean' | 'rejected' | 'failed';
}
