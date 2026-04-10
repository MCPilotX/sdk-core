// Global mock for AI module
export const AI = jest.fn().mockImplementation(() => ({
  configure: jest.fn().mockResolvedValue(undefined),
  ask: jest.fn().mockResolvedValue({
    type: 'suggestions',
    suggestions: ['suggestion1', 'suggestion2'],
    message: 'Test result',
  }),
  generateText: jest.fn().mockResolvedValue('AI generated response'),
  testConnection: jest.fn().mockResolvedValue({
    success: true,
    message: 'Connection test passed',
  }),
  isConfigured: true,
  provider: 'mock',
  model: 'mock-model',
}));

export class AIError extends Error {
  constructor(
    public code: string,
    message: string,
    public category: 'config' | 'connection' | 'execution',
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'AIError';
  }
}