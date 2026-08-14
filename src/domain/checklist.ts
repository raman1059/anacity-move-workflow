import type { ChecklistItemId, DocumentId, RequestId } from './ids';
import type { ChecklistItemSource, ChecklistItemStatus } from './enums';

export interface ChecklistItem {
  id: ChecklistItemId;
  requestId: RequestId;
  key: string;
  label: string;
  required: boolean;
  status: ChecklistItemStatus;
  source: ChecklistItemSource;
  relatedDocumentId?: DocumentId;
  updatedAt: string;
}
