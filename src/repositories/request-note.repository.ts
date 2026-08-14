import type { RequestId, RequestNote } from '../domain';

export interface RequestNoteRepository {
  listByRequest(requestId: RequestId): RequestNote[];
  create(note: RequestNote): RequestNote;
}
