import type { Charge, ChargeId, RequestId } from '../domain';

export interface ChargeRepository {
  getByRequest(requestId: RequestId): Charge | undefined;
  create(charge: Charge): Charge;
  update(id: ChargeId, patch: Partial<Charge>): Charge;
}
