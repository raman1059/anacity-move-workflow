import type { Document } from '../../domain';

export const documents: Document[] = [
  // request-gh-001 — Priya Menon (information_required): NOC still missing
  {
    id: 'doc-gh-001-id',
    requestId: 'request-gh-001',
    typeKey: 'gov_id_proof',
    label: 'Government ID Proof',
    status: 'verified',
    fileName: 'priya_menon_id.pdf',
    uploadedAt: '2026-08-08T10:00:00.000Z',
    verifiedAt: '2026-08-08T12:00:00.000Z',
  },
  {
    id: 'doc-gh-001-lease',
    requestId: 'request-gh-001',
    typeKey: 'lease_agreement',
    label: 'Lease Agreement',
    status: 'verified',
    fileName: 'priya_menon_lease.pdf',
    uploadedAt: '2026-08-08T10:05:00.000Z',
    verifiedAt: '2026-08-08T12:05:00.000Z',
  },
  {
    id: 'doc-gh-001-noc',
    requestId: 'request-gh-001',
    typeKey: 'society_noc',
    label: 'Society NOC',
    status: 'pending_upload',
  },

  // request-gh-002 — Rohan Gupta (under_review): everything verified
  {
    id: 'doc-gh-002-id',
    requestId: 'request-gh-002',
    typeKey: 'gov_id_proof',
    label: 'Government ID Proof',
    status: 'verified',
    fileName: 'rohan_gupta_id.pdf',
    uploadedAt: '2026-08-02T09:00:00.000Z',
    verifiedAt: '2026-08-02T11:00:00.000Z',
  },
  {
    id: 'doc-gh-002-deed',
    requestId: 'request-gh-002',
    typeKey: 'ownership_deed',
    label: 'Ownership Deed',
    status: 'verified',
    fileName: 'rohan_gupta_deed.pdf',
    uploadedAt: '2026-08-02T09:05:00.000Z',
    verifiedAt: '2026-08-02T11:05:00.000Z',
  },
  {
    id: 'doc-gh-002-noc',
    requestId: 'request-gh-002',
    typeKey: 'society_noc',
    label: 'Society NOC',
    status: 'verified',
    fileName: 'rohan_gupta_noc.pdf',
    uploadedAt: '2026-08-05T09:00:00.000Z',
    verifiedAt: '2026-08-05T13:00:00.000Z',
  },

  // request-gh-003 — Divya Nair (draft): nothing uploaded yet — empty on purpose

  // request-gh-004 — Ananya Rao (scheduled move-out): key return pending until move day
  {
    id: 'doc-gh-004-fwd',
    requestId: 'request-gh-004',
    typeKey: 'forwarding_address_proof',
    label: 'Forwarding Address Proof',
    status: 'verified',
    fileName: 'ananya_rao_forwarding.pdf',
    uploadedAt: '2026-07-16T10:00:00.000Z',
    verifiedAt: '2026-07-16T14:00:00.000Z',
  },
  {
    id: 'doc-gh-004-dues',
    requestId: 'request-gh-004',
    typeKey: 'dues_clearance_form',
    label: 'Dues Clearance Acknowledgement',
    status: 'verified',
    fileName: 'ananya_rao_dues.pdf',
    uploadedAt: '2026-07-16T10:05:00.000Z',
    verifiedAt: '2026-07-16T14:05:00.000Z',
  },
  {
    id: 'doc-gh-004-key',
    requestId: 'request-gh-004',
    typeKey: 'key_return_form',
    label: 'Key Return Form',
    status: 'pending_upload',
  },

  // request-gh-005 — Vikram Shah (under_review, charges): dues rejected
  {
    id: 'doc-gh-005-fwd',
    requestId: 'request-gh-005',
    typeKey: 'forwarding_address_proof',
    label: 'Forwarding Address Proof',
    status: 'verified',
    fileName: 'vikram_shah_forwarding.pdf',
    uploadedAt: '2026-08-03T09:00:00.000Z',
    verifiedAt: '2026-08-03T11:00:00.000Z',
  },
  {
    id: 'doc-gh-005-dues',
    requestId: 'request-gh-005',
    typeKey: 'dues_clearance_form',
    label: 'Dues Clearance Acknowledgement',
    status: 'rejected',
    fileName: 'vikram_shah_dues.pdf',
    uploadedAt: '2026-08-03T09:05:00.000Z',
    rejectionReason: 'Outstanding maintenance dues for June-July 2026',
  },
  {
    id: 'doc-gh-005-key',
    requestId: 'request-gh-005',
    typeKey: 'key_return_form',
    label: 'Key Return Form',
    status: 'pending_upload',
  },

  // request-gh-006 — Farah Sheikh (submitted): uploaded, not yet verified
  {
    id: 'doc-gh-006-id',
    requestId: 'request-gh-006',
    typeKey: 'gov_id_proof',
    label: 'Government ID Proof',
    status: 'uploaded',
    fileName: 'farah_sheikh_id.pdf',
    uploadedAt: '2026-08-13T08:06:00.000Z',
  },
  {
    id: 'doc-gh-006-lease',
    requestId: 'request-gh-006',
    typeKey: 'lease_agreement',
    label: 'Lease Agreement',
    status: 'uploaded',
    fileName: 'farah_sheikh_lease.pdf',
    uploadedAt: '2026-08-13T08:06:30.000Z',
  },
  {
    id: 'doc-gh-006-noc',
    requestId: 'request-gh-006',
    typeKey: 'society_noc',
    label: 'Society NOC',
    status: 'pending_upload',
  },

  // request-gh-007 — Aditi Bose (approved, override case): name mismatch between ID and deed
  {
    id: 'doc-gh-007-id',
    requestId: 'request-gh-007',
    typeKey: 'gov_id_proof',
    label: 'Government ID Proof',
    status: 'verified',
    fileName: 'aditi_bose_id.pdf',
    uploadedAt: '2026-07-21T09:00:00.000Z',
    verifiedAt: '2026-07-21T11:00:00.000Z',
  },
  {
    id: 'doc-gh-007-deed',
    requestId: 'request-gh-007',
    typeKey: 'ownership_deed',
    label: 'Ownership Deed',
    status: 'verified',
    fileName: 'deed_aditi_r_bose.pdf',
    uploadedAt: '2026-07-21T09:05:00.000Z',
    verifiedAt: '2026-07-21T11:05:00.000Z',
  },
  {
    id: 'doc-gh-007-noc',
    requestId: 'request-gh-007',
    typeKey: 'society_noc',
    label: 'Society NOC',
    status: 'verified',
    fileName: 'aditi_bose_noc.pdf',
    uploadedAt: '2026-07-25T09:00:00.000Z',
    verifiedAt: '2026-07-25T13:00:00.000Z',
  },

  // request-rv-001 — Karan Verma (completed, historical)
  {
    id: 'doc-rv-001-id',
    requestId: 'request-rv-001',
    typeKey: 'gov_id_proof',
    label: 'Government ID Proof',
    status: 'verified',
    fileName: 'karan_verma_id.pdf',
    uploadedAt: '2026-05-02T09:00:00.000Z',
    verifiedAt: '2026-05-02T11:00:00.000Z',
  },
  {
    id: 'doc-rv-001-deed',
    requestId: 'request-rv-001',
    typeKey: 'ownership_deed',
    label: 'Ownership Deed',
    status: 'verified',
    fileName: 'karan_verma_deed.pdf',
    uploadedAt: '2026-05-02T09:05:00.000Z',
    verifiedAt: '2026-05-02T11:05:00.000Z',
  },

  // request-rv-002 — Meera Iyer (escalated): dues are fine, the issue is purely policy ambiguity
  {
    id: 'doc-rv-002-dues',
    requestId: 'request-rv-002',
    typeKey: 'dues_clearance_form',
    label: 'Dues Clearance Acknowledgement',
    status: 'verified',
    fileName: 'meera_iyer_dues.pdf',
    uploadedAt: '2026-08-10T07:35:00.000Z',
    verifiedAt: '2026-08-10T09:00:00.000Z',
  },

  // request-rv-003 — Imran Qureshi (rejected): dues never cleared
  {
    id: 'doc-rv-003-dues',
    requestId: 'request-rv-003',
    typeKey: 'dues_clearance_form',
    label: 'Dues Clearance Acknowledgement',
    status: 'rejected',
    fileName: 'imran_qureshi_dues.pdf',
    uploadedAt: '2026-07-12T09:00:00.000Z',
    rejectionReason: 'Outstanding dues of ₹18,400 unresolved after two reminder cycles',
  },

  // request-rv-004 — Sanjay Kulkarni (cancelled): was in progress when cancelled
  {
    id: 'doc-rv-004-dues',
    requestId: 'request-rv-004',
    typeKey: 'dues_clearance_form',
    label: 'Dues Clearance Acknowledgement',
    status: 'uploaded',
    fileName: 'sanjay_kulkarni_dues.pdf',
    uploadedAt: '2026-07-28T09:00:00.000Z',
  },
];
