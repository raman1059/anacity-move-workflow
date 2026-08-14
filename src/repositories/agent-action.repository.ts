import type { AgentAction, RequestId } from '../domain';

export interface AgentActionRepository {
  listByRequest(requestId: RequestId): AgentAction[];
  create(action: AgentAction): AgentAction;
}
