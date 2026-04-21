import type { WorkflowStep } from '../types';

// Helper function to call backend intent parsing API
async function callBackendIntentAPI(intent: string): Promise<any> {
  try {
    // First, ensure we have an auth token
    let token = localStorage.getItem('auth_token');
    
    // If no token, try to get one from daemon automatically
    if (!token) {
      try {
        console.log('[AI Service] No auth token found, attempting to get one from daemon...');
        const tokenResponse = await fetch('http://localhost:9658/api/auth/token');
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData && tokenData.token) {
            token = tokenData.token;
            if (token) {
              localStorage.setItem('auth_token', token);
              console.log('[AI Service] Successfully obtained and stored auth token');
            }
          }
        }
      } catch (tokenError) {
        console.warn('[AI Service] Failed to get auth token from daemon:', tokenError);
        // Continue without token, will get 401 error
      }
    }
    
    // Call backend API endpoint
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('http://localhost:9658/api/intent/parse', {
      method: 'POST',
      headers,
      body: JSON.stringify({ intent })
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling backend intent API:', error);
    throw error;
  }
}

// Main AI service - no fallback logic
export const aiService = {
  async parseIntent(intent: string): Promise<{ steps: WorkflowStep[], status: 'success' | 'capability_missing' }> {
    console.log(`[AI Service] Parsing intent: "${intent}"`);
    
    try {
      // Always try to call the backend intent parsing API first
      console.log('[AI Service] Calling backend API...');
      const backendResult = await callBackendIntentAPI(intent);
      console.log('[AI Service] Backend API response:', backendResult);
      
      if (backendResult.success && backendResult.data) {
        console.log(`[AI Service] Backend API success, returning ${backendResult.data.steps.length} steps`);
        
        // Ensure steps use serverName instead of serverId
        const steps = backendResult.data.steps.map((step: any) => {
          if (step.serverId) {
            return {
              ...step,
              serverName: step.serverId,
              serverId: undefined
            };
          }
          return step;
        });
        
        return {
          steps,
          status: backendResult.data.status
        };
      }
      
      console.log('[AI Service] Backend API did not return success data');
      // No fallback - return capability_missing
      return { status: 'capability_missing', steps: [] };
      
    } catch (error) {
      // Network error or backend unavailable - no fallback
      console.error('[AI Service] Backend intent API unavailable:', error);
      return { status: 'capability_missing', steps: [] };
    }
  }
};
