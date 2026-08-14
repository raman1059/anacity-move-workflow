// Shared in-memory CRUD primitive used by the plain-entity repositories
// (Community, Document, ChecklistItem, MoveSlot, Charge, ...). MoveRequest
// and AgentConversation have their own logic because a union type
// (MoveRequest) and an append-only child collection (messages) don't fit
// this generic shape cleanly.
export class EntityStore<T extends { id: string }> {
  private readonly byId = new Map<string, T>();

  constructor(seed: T[]) {
    for (const item of seed) {
      this.byId.set(item.id, item);
    }
  }

  getById(id: string): T | undefined {
    return this.byId.get(id);
  }

  list(): T[] {
    return Array.from(this.byId.values());
  }

  create(item: T): T {
    this.byId.set(item.id, item);
    return item;
  }

  update(id: string, patch: Partial<T>): T {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Entity ${id} not found`);
    }
    const updated = { ...existing, ...patch };
    this.byId.set(id, updated);
    return updated;
  }
}
