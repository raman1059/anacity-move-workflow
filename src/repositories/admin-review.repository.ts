import type { AdminReview, RequestId } from '../domain';

export interface AdminReviewRepository {
  listByRequest(requestId: RequestId): AdminReview[];
  create(review: AdminReview): AdminReview;
}
