export type AccountRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';

export interface AccountRequest {
  id: string;
  type: 'data_export' | 'account_deletion' | 'campus_change';
  status: AccountRequestStatus;
  targetUniversityId: string | null;
  reason: string | null;
  requestedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface MeView {
  userId: string;
  campusId: string;
  campusName: string | null;
  roles: Array<{ roleName: string }>;
}
