// The community configuration layer: per-community CommunityConfiguration
// (operational rules — documents, notice periods, deposit/charge rules,
// scheduling, approval thresholds, admin permissions) and CommunityPolicy
// (human-readable, topic-scoped, citable clauses). Everything here is
// data, not logic — adding a community means adding a file in this
// directory, never touching the workflow/agent code that consumes it.
export * from './communities';
export * from './policies';
