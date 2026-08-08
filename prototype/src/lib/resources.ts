import type { Resource } from '@/types';

export interface ApiResource {
  id: string;
  type: 'notes' | 'past_paper' | 'assignment' | 'lab_manual' | 'presentation';
  title: string;
  description: string | null;
  subjectId: string | null;
  uploaderId: string;
  mimeType: string | null;
  bytes: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: string;
  status?: 'needs_review' | 'approved' | 'rejected';
  scanState?: 'pending' | 'clean' | 'quarantined' | 'rejected';
}

export function mapResource(item: ApiResource): Resource & { sourceType: 'pdf' } {
  const sourceType: Resource['sourceType'] = item.mimeType?.includes('pdf') ? 'pdf' : 'pdf';
  return { id: item.id, title: item.title, subject: item.subjectId ?? 'Campus resource', department: 'Campus', semester: new Date(item.createdAt).getFullYear().toString(), uploader: item.uploaderId, description: item.description ?? 'Campus-contributed study material.', rating: item.ratingAvg ?? 0, saves: 0, status: 'approved', accent: '#FFF7D6', ownerId: item.uploaderId, sourceType };
}
