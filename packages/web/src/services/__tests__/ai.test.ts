import { describe, it, expect } from 'vitest';
import { aiService } from '../ai-service';

describe('aiService.parseIntent', () => {
  it('should parse user intent into workflow steps', async () => {
    const intent = 'Sync GitHub stars to Notion';
    const result = await aiService.parseIntent(intent);
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.status).toBe('success');
  });

  it('should return capability_missing if intent cannot be satisfied', async () => {
    const intent = 'Make me a coffee';
    const result = await aiService.parseIntent(intent);
    expect(result.status).toBe('capability_missing');
    expect(result.steps).toHaveLength(0);
  });
});
