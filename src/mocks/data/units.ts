import type { Unit } from '../../domain';
import { GREENFIELD_HEIGHTS_ID } from '../../config/communities/greenfield-heights';
import { RIVERSIDE_VILLAS_ID } from '../../config/communities/riverside-villas';
import { WILLOW_CREEK_ID } from '../../config/communities/willow-creek';

export const units: Unit[] = [
  {
    id: 'unit-gh-108',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-108',
    block: 'A',
    floor: 1,
    type: 'apartment',
    currentResidentIds: [],
    status: 'pending_move_in',
  },
  {
    id: 'unit-gh-415',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-415',
    block: 'B',
    floor: 4,
    type: 'apartment',
    currentResidentIds: [],
    status: 'pending_move_in',
  },
  {
    id: 'unit-gh-501',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-501',
    block: 'C',
    floor: 5,
    type: 'apartment',
    // Draft request only — nothing has been committed against the unit yet.
    currentResidentIds: [],
    status: 'vacant',
  },
  {
    id: 'unit-gh-204',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-204',
    block: 'A',
    floor: 2,
    type: 'apartment',
    currentResidentIds: ['resident-ananya-rao'],
    status: 'pending_move_out',
  },
  {
    id: 'unit-gh-310',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-310',
    block: 'A',
    floor: 3,
    type: 'apartment',
    currentResidentIds: ['resident-vikram-shah'],
    status: 'pending_move_out',
  },
  {
    id: 'unit-gh-602',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-602',
    block: 'C',
    floor: 6,
    type: 'apartment',
    currentResidentIds: [],
    status: 'pending_move_in',
  },
  {
    id: 'unit-gh-701',
    communityId: GREENFIELD_HEIGHTS_ID,
    unitNumber: 'GH-701',
    block: 'D',
    floor: 7,
    type: 'apartment',
    currentResidentIds: [],
    status: 'pending_move_in',
  },
  {
    id: 'unit-rv-05',
    communityId: RIVERSIDE_VILLAS_ID,
    unitNumber: 'RV-05',
    type: 'villa',
    currentResidentIds: ['resident-karan-verma'],
    status: 'occupied',
  },
  {
    id: 'unit-rv-12',
    communityId: RIVERSIDE_VILLAS_ID,
    unitNumber: 'RV-12',
    type: 'villa',
    currentResidentIds: ['resident-meera-iyer'],
    status: 'pending_move_out',
  },
  {
    id: 'unit-rv-21',
    communityId: RIVERSIDE_VILLAS_ID,
    unitNumber: 'RV-21',
    type: 'villa',
    // Move-out was rejected, so the resident remains — status stays occupied.
    currentResidentIds: ['resident-imran-qureshi'],
    status: 'occupied',
  },
  {
    id: 'unit-rv-09',
    communityId: RIVERSIDE_VILLAS_ID,
    unitNumber: 'RV-09',
    type: 'villa',
    // Move-out was cancelled by the resident, so the resident remains.
    currentResidentIds: ['resident-sanjay-kulkarni'],
    status: 'occupied',
  },

  // Willow Creek Co-Living — added with zero changes to any
  // agent/tool/service code, only this config-adjacent seed data.
  {
    id: 'unit-wc-101',
    communityId: WILLOW_CREEK_ID,
    unitNumber: 'WC-101',
    floor: 1,
    type: 'studio',
    currentResidentIds: [],
    status: 'pending_move_in',
  },
  {
    id: 'unit-wc-102',
    communityId: WILLOW_CREEK_ID,
    unitNumber: 'WC-102',
    floor: 1,
    type: 'studio',
    currentResidentIds: ['resident-jamie-flores'],
    status: 'occupied',
  },
];
