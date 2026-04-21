# Intelligent Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an "Intelligent Orchestration" feature that allows users to generate workflows from natural language descriptions using AI.

**Architecture:** A new page `Orchestration.tsx` with a dual-panel layout: `AIChatPanel` for interaction and `StepPreviewBoard` for real-time workflow draft visualization. It integrates with `aiService.parseIntent` for AI logic and `apiService` for tool discovery and workflow persistence.

**Tech Stack:** React, TanStack Query, Lucide Icons, Vitest, React Testing Library.

---

### Task 1: Setup Testing Environment

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add testing dependencies**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Update scripts in package.json**
Add `"test": "vitest"` and `"test:ui": "vitest --ui"` to `scripts`.

- [ ] **Step 3: Create vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Create src/test/setup.ts**
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Run tests to verify setup**
```bash
npm test
```
Expected: PASS (with no tests found)

### Task 2: Implement aiService.parseIntent

**Files:**
- Create: `src/services/ai.ts`
- Create: `src/services/__tests__/ai.test.ts`

- [ ] **Step 1: Write failing test for parseIntent**
```typescript
import { aiService } from '../ai';

describe('aiService.parseIntent', () => {
  it('should parse user intent into workflow steps', async () => {
    const intent = 'Sync GitHub stars to Notion';
    const result = await aiService.parseIntent(intent);
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement minimal aiService.ts**
```typescript
import { WorkflowStep } from '../types';

export const aiService = {
  async parseIntent(intent: string): Promise<{ steps: WorkflowStep[], status: 'success' | 'capability_missing' }> {
    // Simulated implementation
    if (intent.toLowerCase().includes('github') && intent.toLowerCase().includes('notion')) {
      return {
        status: 'success',
        steps: [
          { id: '1', type: 'tool', serverId: 'github', toolName: 'list_stars', parameters: {} },
          { id: '2', type: 'tool', serverId: 'notion', toolName: 'create_page', parameters: {} }
        ]
      };
    }
    return { status: 'capability_missing', steps: [] };
  }
};
```

- [ ] **Step 3: Run test to verify it passes**
```bash
npm test src/services/__tests__/ai.test.ts
```

### Task 3: Create Orchestration Components

**Files:**
- Create: `src/components/orchestration/AIChatPanel.tsx`
- Create: `src/components/orchestration/StepPreviewBoard.tsx`
- Create: `src/components/orchestration/StepCard.tsx`
- Create: `src/components/orchestration/__tests__/AIChatPanel.test.tsx`

- [ ] **Step 1: Implement StepCard.tsx**
Display step type, server, tool, and parameters.

- [ ] **Step 2: Implement AIChatPanel.tsx**
Chat interface with message history and input.

- [ ] **Step 3: Implement StepPreviewBoard.tsx**
List of StepCards with "Publish" and "Clear" actions.

- [ ] **Step 4: Write tests for AIChatPanel**
Verify input triggers callback.

### Task 4: Create Orchestration Page

**Files:**
- Create: `src/pages/Orchestration.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/contexts/LanguageContext.tsx`

- [ ] **Step 1: Add translations for Orchestration**
Update `translations` in `LanguageContext.tsx`.

- [ ] **Step 2: Implement Orchestration.tsx**
Coordinate state between `AIChatPanel` and `StepPreviewBoard`. Handle `parseIntent` and `saveWorkflow`.

- [ ] **Step 3: Add route to App.tsx**
```typescript
<Route path="orchestration" element={<Orchestration />} />
```

- [ ] **Step 4: Add link to Layout.tsx**
Add "Intelligent Orchestration" to `navigation`.

### Task 5: Integration & Refinement

- [ ] **Step 1: Refine aiService.parseIntent**
Inject installed servers and hub search into the prompt logic (or simulation).

- [ ] **Step 2: Handle "Capability Missing" state**
Show special card in `StepPreviewBoard` when status is `capability_missing`.

- [ ] **Step 3: Final verification**
Run all tests and manual check.
