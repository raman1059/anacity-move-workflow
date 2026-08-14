// The mock persistence layer: seed data (src/mocks/data) plus in-memory
// repository implementations (src/mocks/repositories) that satisfy the
// interfaces in src/repositories. This is the only layer that will change
// when real persistence is introduced — see createMockRepositories.
export { seedData } from './data';
export { createMockRepositories } from './repositories';
export type { SeedData } from './types';
