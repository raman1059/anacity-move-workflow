import type { CommunityPolicy } from '../../domain';
import { greenfieldHeightsPolicies } from './greenfield-heights.policies';
import { riversideVillasPolicies } from './riverside-villas.policies';
import { willowCreekPolicies } from './willow-creek.policies';

export const policies: CommunityPolicy[] = [
  ...greenfieldHeightsPolicies,
  ...riversideVillasPolicies,
  ...willowCreekPolicies,
];

export * from './greenfield-heights.policies';
export * from './riverside-villas.policies';
export * from './willow-creek.policies';
