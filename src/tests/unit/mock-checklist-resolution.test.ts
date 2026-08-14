import { describe, expect, it } from 'vitest';
import { mockResolveChecklistItem } from '@/lib/mock-checklist-resolution';
import { createMockRepositories, seedData } from '@/mocks';

describe('mockResolveChecklistItem', () => {
  it('marks a non-document checklist item verified', () => {
    const repositories = createMockRepositories(seedData);
    // request-gh-005 (Vikram) has a 'rejected' dues_cleared system-check item.
    const item = mockResolveChecklistItem(repositories, 'request-gh-005', 'dues_cleared');

    expect(item.status).toBe('verified');
    expect(item.key).toBe('dues_cleared');

    const stored = repositories.checklistItems
      .listByRequest('request-gh-005')
      .find((i) => i.key === 'dues_cleared');
    expect(stored?.status).toBe('verified');
  });

  it('throws a clear error when there is no matching checklist item', () => {
    const repositories = createMockRepositories(seedData);
    expect(() =>
      mockResolveChecklistItem(repositories, 'request-gh-005', 'not_a_real_key')
    ).toThrow(/No checklist item found/);
  });
});
