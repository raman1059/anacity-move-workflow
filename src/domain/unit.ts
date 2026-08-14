import type { CommunityId, ResidentId, UnitId } from './ids';
import type { UnitStatus } from './enums';

export type UnitType = 'apartment' | 'villa' | 'studio';

export interface Unit {
  id: UnitId;
  communityId: CommunityId;
  unitNumber: string;
  block?: string;
  floor?: number;
  type: UnitType;
  // Denormalized for mock convenience; a relational store would derive
  // this from Resident.unitId instead of duplicating it here.
  currentResidentIds: ResidentId[];
  status: UnitStatus;
}
