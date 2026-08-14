import type { CommunityId, ResidentId, UnitId } from './ids';
import type { ResidentStatus, ResidentType } from './enums';

export interface Resident {
  id: ResidentId;
  communityId: CommunityId;
  unitId: UnitId | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  residentType: ResidentType;
  isPrimary: boolean;
  status: ResidentStatus;
  createdAt: string;
}
