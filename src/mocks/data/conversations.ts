import type { AgentConversation } from '../../domain';

export const conversations: AgentConversation[] = [
  {
    id: 'conv-gh-001',
    requestId: 'request-gh-001',
    actorId: 'resident-priya-menon',
    actorRole: 'resident',
    createdAt: '2026-08-05T09:12:00.000Z',
    updatedAt: '2026-08-10T14:00:05.000Z',
    messages: [
      {
        id: 'msg-gh-001-1',
        role: 'user',
        content: "Hi, I'd like to start a move-in request for unit GH-108.",
        relatedActionIds: [],
        createdAt: '2026-08-05T09:12:00.000Z',
      },
      {
        id: 'msg-gh-001-2',
        role: 'agent',
        content:
          "Started your move-in request for GH-108. I'll need a few things: government ID proof, lease agreement, Society NOC, and your occupant count. Please share these when ready.",
        relatedActionIds: ['act-gh-001-01', 'act-gh-001-02', 'act-gh-001-03', 'act-gh-001-04'],
        createdAt: '2026-08-05T09:12:09.000Z',
      },
      {
        id: 'msg-gh-001-3',
        role: 'user',
        content: "Occupant count is 2. I've uploaded my ID and lease agreement.",
        relatedActionIds: [],
        createdAt: '2026-08-08T10:10:00.000Z',
      },
      {
        id: 'msg-gh-001-4',
        role: 'agent',
        content:
          'Got it — ID and lease agreement look good. Still waiting on your Society NOC before I can move this to review. Let me know once you have it.',
        relatedActionIds: ['act-gh-001-05', 'act-gh-001-06'],
        createdAt: '2026-08-08T12:06:05.000Z',
      },
      {
        id: 'msg-gh-001-5',
        role: 'system',
        content: 'No response for 2 days — marked as awaiting information (NOC still pending).',
        relatedActionIds: ['act-gh-001-07', 'act-gh-001-08'],
        createdAt: '2026-08-10T14:00:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-002',
    requestId: 'request-gh-002',
    actorId: 'resident-rohan-gupta',
    actorRole: 'resident',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-09T11:29:00.000Z',
    messages: [
      {
        id: 'msg-gh-002-1',
        role: 'user',
        content:
          "I'd like to move in to GH-415, planned for Aug 25. Here's my ID, ownership deed, and Society NOC.",
        relatedActionIds: [],
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'msg-gh-002-2',
        role: 'agent',
        content:
          "Your move-in request for GH-415 is complete — ID proof, ownership deed, and Society NOC are all verified. I've recommended approval to the community admin; you'll be notified once it's confirmed. In the meantime, here are some available move slots: Aug 20 2-3pm, Aug 30 10-11am.",
        relatedActionIds: [
          'act-gh-002-01',
          'act-gh-002-02',
          'act-gh-002-03',
          'act-gh-002-04',
          'act-gh-002-05',
          'act-gh-002-06',
          'act-gh-002-07',
          'act-gh-002-08',
          'act-gh-002-09',
        ],
        createdAt: '2026-08-09T11:29:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-003',
    requestId: 'request-gh-003',
    actorId: 'resident-divya-nair',
    actorRole: 'resident',
    createdAt: '2026-08-12T16:40:00.000Z',
    updatedAt: '2026-08-12T16:40:05.000Z',
    messages: [
      {
        id: 'msg-gh-003-1',
        role: 'user',
        content: "I'm thinking of moving into GH-501 sometime next month, just exploring for now.",
        relatedActionIds: [],
        createdAt: '2026-08-12T16:40:00.000Z',
      },
      {
        id: 'msg-gh-003-2',
        role: 'agent',
        content:
          "No problem — I've started a draft request for GH-501. Come back anytime to continue; nothing is submitted yet.",
        relatedActionIds: ['act-gh-003-01'],
        createdAt: '2026-08-12T16:40:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-004',
    requestId: 'request-gh-004',
    actorId: 'resident-ananya-rao',
    actorRole: 'resident',
    createdAt: '2026-08-11T09:58:00.000Z',
    updatedAt: '2026-08-11T10:00:05.000Z',
    messages: [
      {
        id: 'msg-gh-004-1',
        role: 'user',
        content: 'Confirming move-out from GH-204 on Aug 20.',
        relatedActionIds: [],
        createdAt: '2026-08-11T09:58:00.000Z',
      },
      {
        id: 'msg-gh-004-2',
        role: 'agent',
        content:
          'Confirmed — your move-out is approved and scheduled for Aug 20, 9-10am (Service Elevator). No deductions apply; your full deposit of ₹50,000 is set to be refunded.',
        relatedActionIds: ['act-gh-004-01', 'act-gh-004-02'],
        createdAt: '2026-08-11T10:00:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-005',
    requestId: 'request-gh-005',
    actorId: 'resident-vikram-shah',
    actorRole: 'resident',
    createdAt: '2026-08-03T08:00:00.000Z',
    updatedAt: '2026-08-13T09:06:00.000Z',
    messages: [
      {
        id: 'msg-gh-005-1',
        role: 'user',
        content: "I need to move out of GH-310 by Aug 13 — that's today, I know it's short notice.",
        relatedActionIds: [],
        createdAt: '2026-08-03T08:00:00.000Z',
      },
      {
        id: 'msg-gh-005-2',
        role: 'agent',
        content:
          "Thanks for letting me know. Your requested date is well short of our 30-day notice policy, so a short-notice penalty applies, and I also see outstanding maintenance dues on file. Here's the estimated settlement: security deposit ₹50,000, less short-notice penalty ₹10,000, less outstanding dues ₹8,400, less standard cleaning fee ₹2,000 — estimated net refund ₹29,600. This is pending admin confirmation before it's final.",
        relatedActionIds: [
          'act-gh-005-01',
          'act-gh-005-02',
          'act-gh-005-03',
          'act-gh-005-04',
          'act-gh-005-05',
          'act-gh-005-06',
          'act-gh-005-07',
        ],
        createdAt: '2026-08-13T09:06:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-006',
    requestId: 'request-gh-006',
    actorId: 'resident-farah-sheikh',
    actorRole: 'resident',
    createdAt: '2026-08-13T08:05:00.000Z',
    updatedAt: '2026-08-13T08:07:05.000Z',
    messages: [
      {
        id: 'msg-gh-006-1',
        role: 'user',
        content: 'Submitting my move-in request for GH-602.',
        relatedActionIds: [],
        createdAt: '2026-08-13T08:05:00.000Z',
      },
      {
        id: 'msg-gh-006-2',
        role: 'agent',
        content:
          "Thanks — I've received your ID proof and lease agreement, still processing your Society NOC. I'll follow up once everything is verified.",
        relatedActionIds: ['act-gh-006-01', 'act-gh-006-02'],
        createdAt: '2026-08-13T08:07:05.000Z',
      },
    ],
  },
  {
    id: 'conv-gh-007',
    requestId: 'request-gh-007',
    actorId: 'resident-aditi-bose',
    actorRole: 'resident',
    createdAt: '2026-08-07T09:55:00.000Z',
    updatedAt: '2026-08-08T15:45:05.000Z',
    messages: [
      {
        id: 'msg-gh-007-1',
        role: 'user',
        content: "I've submitted everything for my move-in to GH-701.",
        relatedActionIds: [],
        createdAt: '2026-08-07T09:55:00.000Z',
      },
      {
        id: 'msg-gh-007-2',
        role: 'agent',
        content:
          "I've reviewed your documents. Everything looks complete, but I noticed the name on your ID (Aditi Bose) doesn't exactly match the ownership deed (Aditi R. Bose), so I've flagged this for admin review rather than recommending approval outright.",
        relatedActionIds: ['act-gh-007-01', 'act-gh-007-02'],
        createdAt: '2026-08-07T10:00:10.000Z',
      },
      {
        id: 'msg-gh-007-3',
        role: 'system',
        content:
          'An administrator called to verify and approved your request on 2026-08-08. Welcome to Greenfield Heights!',
        relatedActionIds: [],
        createdAt: '2026-08-08T15:45:05.000Z',
      },
    ],
  },
  {
    id: 'conv-rv-001',
    requestId: 'request-rv-001',
    actorId: 'resident-karan-verma',
    actorRole: 'resident',
    createdAt: '2026-05-22T11:59:00.000Z',
    updatedAt: '2026-05-22T12:00:05.000Z',
    messages: [
      {
        id: 'msg-rv-001-1',
        role: 'user',
        content: 'Just confirming my move-in to RV-05 went smoothly.',
        relatedActionIds: [],
        createdAt: '2026-05-22T11:59:00.000Z',
      },
      {
        id: 'msg-rv-001-2',
        role: 'agent',
        content: 'Yes — your move-in was completed on May 20. Welcome to Riverside Villas!',
        relatedActionIds: ['act-rv-001-01'],
        createdAt: '2026-05-22T12:00:05.000Z',
      },
    ],
  },
  {
    id: 'conv-rv-002',
    requestId: 'request-rv-002',
    actorId: 'resident-meera-iyer',
    actorRole: 'resident',
    createdAt: '2026-08-10T07:30:00.000Z',
    updatedAt: '2026-08-12T09:00:05.000Z',
    messages: [
      {
        id: 'msg-rv-002-1',
        role: 'user',
        content:
          "I need to move out in 5 days — it's a family emergency. Can you waive the notice requirement?",
        relatedActionIds: [],
        createdAt: '2026-08-10T07:30:00.000Z',
      },
      {
        id: 'msg-rv-002-2',
        role: 'agent',
        content:
          "I understand this is urgent. Riverside Villas doesn't have a defined policy for emergency notice exceptions, so I'm not able to waive this myself — I've flagged your request for the community manager, who will follow up with you directly.",
        relatedActionIds: ['act-rv-002-01', 'act-rv-002-02', 'act-rv-002-03'],
        createdAt: '2026-08-12T09:00:05.000Z',
      },
    ],
  },
  {
    id: 'conv-rv-003',
    requestId: 'request-rv-003',
    actorId: 'resident-imran-qureshi',
    actorRole: 'resident',
    createdAt: '2026-08-06T13:04:00.000Z',
    updatedAt: '2026-08-06T13:05:05.000Z',
    messages: [
      {
        id: 'msg-rv-003-1',
        role: 'user',
        content: 'Why was my move-out request rejected?',
        relatedActionIds: [],
        createdAt: '2026-08-06T13:04:00.000Z',
      },
      {
        id: 'msg-rv-003-2',
        role: 'agent',
        content:
          'Your request was rejected because outstanding dues of ₹18,400 remained unresolved after two reminder cycles. Please clear your dues and submit a new move-out request.',
        relatedActionIds: ['act-rv-003-01'],
        createdAt: '2026-08-06T13:05:05.000Z',
      },
    ],
  },
  {
    id: 'conv-rv-004',
    requestId: 'request-rv-004',
    actorId: 'resident-sanjay-kulkarni',
    actorRole: 'resident',
    createdAt: '2026-08-05T09:59:00.000Z',
    updatedAt: '2026-08-05T10:00:05.000Z',
    messages: [
      {
        id: 'msg-rv-004-1',
        role: 'user',
        content: "Actually, I've decided not to move out after all — please cancel my request.",
        relatedActionIds: [],
        createdAt: '2026-08-05T09:59:00.000Z',
      },
      {
        id: 'msg-rv-004-2',
        role: 'agent',
        content: "Understood — I've cancelled your move-out request for RV-09.",
        relatedActionIds: ['act-rv-004-01'],
        createdAt: '2026-08-05T10:00:05.000Z',
      },
    ],
  },
];
