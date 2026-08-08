import { apiPost } from './api';

export interface AssistantSource {
  type: string;
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  openPath: string;
}

export interface AssistantReply {
  responseId: string;
  answer: string;
  sources: AssistantSource[];
  cannotVerify: boolean;
}

export function askAssistant(message: string): Promise<AssistantReply> {
  return apiPost<AssistantReply>('/assistant/messages', { message }).then((reply) => ({
    ...reply,
    sources: reply.sources.map((source) => ({ ...source, openPath: sourcePath(source.type, source.id, source.openPath) })),
  }));
}

function sourcePath(type: string, id: string, fallback: string): string {
  switch (type) {
    case 'resource': return `/discover/notes/${id}`;
    case 'event': return `/discover/events/${id}`;
    case 'club': return `/discover/clubs/${id}`;
    case 'listing': return `/discover/listings/${id}`;
    case 'post': return `/post/${id}`;
    case 'opportunity': return '/discover/opportunities';
    default: return fallback;
  }
}
