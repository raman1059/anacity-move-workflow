import type { AdminReview } from '../../domain';
import type { AdminReviewRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryAdminReviewRepository(seed: AdminReview[]): AdminReviewRepository {
  const store = new EntityStore<AdminReview>(seed);

  return {
    listByRequest: (requestId) => store.list().filter((r) => r.requestId === requestId),
    create: (review) => store.create(review),
  };
}
