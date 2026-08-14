import { communities, communityConfigurations, policies } from '../../config';
import type { SeedData } from '../types';
import { adminReviews } from './adminReviews';
import { agentActions } from './agentActions';
import { charges } from './charges';
import { checklistItems } from './checklistItems';
import { conversations } from './conversations';
import { documents } from './documents';
import { moveRequests } from './moveRequests';
import { moveSlots } from './moveSlots';
import { requestNotes } from './requestNotes';
import { residents } from './residents';
import { units } from './units';

// Configuration (communities, their CommunityConfiguration, and policy
// clauses) comes from src/config — the part of this data that represents
// real, evolvable business rules. Everything below is operational/
// transactional data that would live in a real database in production.
export const seedData: SeedData = {
  communities,
  communityConfigurations,
  policies,
  residents,
  units,
  moveRequests,
  documents,
  checklistItems,
  moveSlots,
  charges,
  conversations,
  agentActions,
  adminReviews,
  requestNotes,
};
