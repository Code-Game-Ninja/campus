export interface ApiClub {
  id: string;
  campusId: string;
  type: string;
  name: string;
  slug: string;
  visibility: 'public' | 'campus' | 'followers';
  status: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationProof: string | null;
  createdAt: string;
}

export interface ApiClubMember {
  id: string;
  communityId: string;
  userId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: string;
  joinedAt: string;
}
