import type { ChecklistItem, ChecklistItemId, RequestId } from '../domain';

export interface ChecklistRepository {
  listByRequest(requestId: RequestId): ChecklistItem[];
  create(item: ChecklistItem): ChecklistItem;
  update(id: ChecklistItemId, patch: Partial<ChecklistItem>): ChecklistItem;
}
