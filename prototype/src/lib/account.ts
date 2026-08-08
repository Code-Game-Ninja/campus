export type AccountRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';

export interface AccountRequest {
  id: string;
  type: 'data_export' | 'account_deletion' | 'campus_change' | 'organizer_access';
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

export function hasOrganizerAccess(roles: MeView['roles'] | undefined): boolean {
  return Boolean(roles?.some((role) =>
    role.roleName === 'club_admin' ||
    role.roleName === 'campus_admin' ||
    role.roleName === 'platform_admin',
  ));
}

export function activeOrganizerRequest(requests: AccountRequest[] | undefined): AccountRequest | undefined {
  return requests?.find((request) =>
    request.type === 'organizer_access' &&
    (request.status === 'pending' || request.status === 'processing'),
  );
}
