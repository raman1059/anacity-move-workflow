import type { Community, CommunityConfiguration } from '../../domain';
import { greenfieldHeightsCommunity, greenfieldHeightsConfiguration } from './greenfield-heights';
import { riversideVillasCommunity, riversideVillasConfiguration } from './riverside-villas';
import { willowCreekCommunity, willowCreekConfiguration } from './willow-creek';

export const communities: Community[] = [
  greenfieldHeightsCommunity,
  riversideVillasCommunity,
  willowCreekCommunity,
];

export const communityConfigurations: CommunityConfiguration[] = [
  greenfieldHeightsConfiguration,
  riversideVillasConfiguration,
  willowCreekConfiguration,
];

export * from './greenfield-heights';
export * from './riverside-villas';
export * from './willow-creek';
