import type { NoteId, RequestId } from './ids';

export type NoteAuthorType = 'agent' | 'admin' | 'resident';

export interface RequestNote {
  id: NoteId;
  requestId: RequestId;
  authorType: NoteAuthorType;
  authorId: string;
  text: string;
  category: string;
  createdAt: string;
}
