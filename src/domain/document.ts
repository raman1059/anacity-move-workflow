import type { DocumentId, RequestId } from './ids';
import type { DocumentStatus } from './enums';

export interface Document {
  id: DocumentId;
  requestId: RequestId;
  // Matches a DocumentRequirement.key from the community's CommunityConfiguration
  typeKey: string;
  label: string;
  status: DocumentStatus;
  fileName?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}
