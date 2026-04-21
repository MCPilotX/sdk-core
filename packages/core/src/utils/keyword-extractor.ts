/**
 * Generic keyword extractor for multilingual query analysis
 * Supports Chinese, English, and common patterns
 */

/**
 * Extract keywords from a query string
 * Supports multilingual text including Chinese and English
 */
export function extractKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // Convert to lowercase for English processing
  const queryLower = query.toLowerCase();
  
  // 1. Extract Chinese characters and combinations
  const chineseChars = query.match(/[\u4e00-\u9fa5]/g) || [];
  
  // Create 2-character combinations from consecutive Chinese characters
  for (let i = 0; i < chineseChars.length - 1; i++) {
    keywords.push(chineseChars[i] + chineseChars[i + 1]);
  }
  
  // Create 3-character combinations from consecutive Chinese characters
  for (let i = 0; i < chineseChars.length - 2; i++) {
    keywords.push(chineseChars[i] + chineseChars[i + 1] + chineseChars[i + 2]);
  }
  
  // Also add individual Chinese characters as keywords
  keywords.push(...chineseChars);
  
  // 2. Extract English words (3+ letters)
  const englishMatches = queryLower.match(/\b[a-z]{3,}\b/g) || [];
  keywords.push(...englishMatches);
  
  // 3. Extract common patterns like dates, numbers, etc.
  // Standard date format: YYYY-MM-DD
  const dateMatches = query.match(/\d{4}-\d{2}-\d{2}/g) || [];
  keywords.push(...dateMatches);
  
  // Chinese date format: YYYY年MM月DD日
  const chineseDateMatches = query.match(/\d{4}年\d{1,2}月\d{1,2}日/g) || [];
  keywords.push(...chineseDateMatches);
  
  // 4. Extract numbers (for IDs, quantities, etc.)
  const numberMatches = query.match(/\d+/g) || [];
  keywords.push(...numberMatches);
  
  // 5. Extract hyphenated words and compound terms
  const hyphenatedMatches = queryLower.match(/\b[a-z]+(?:-[a-z]+)+\b/g) || [];
  keywords.push(...hyphenatedMatches);
  
  // 6. Extract tool-like patterns (get-xxx, fetch-xxx, etc.)
  const toolPatternMatches = queryLower.match(/\b(?:get|fetch|query|search|find|list|create|update|delete)-[a-z]+\b/g) || [];
  keywords.push(...toolPatternMatches);
  
  // Remove duplicates and empty strings
  const uniqueKeywords = [...new Set(keywords.filter(k => k && k.length > 0))];
  
  return uniqueKeywords;
}

/**
 * Check if a keyword matches a tool property (name, description, keywords)
 * Case-insensitive and supports partial matching
 */
export function keywordMatchesTool(
  keyword: string,
  tool: { name?: string; description?: string; keywords?: string[] },
): boolean {
  const keywordLower = keyword.toLowerCase();
  
  // Check tool name
  if (tool.name && tool.name.toLowerCase().includes(keywordLower)) {
    return true;
  }
  
  // Check tool description
  if (tool.description && tool.description.toLowerCase().includes(keywordLower)) {
    return true;
  }
  
  // Check tool keywords array
  if (tool.keywords) {
    return tool.keywords.some(k => k.toLowerCase().includes(keywordLower));
  }
  
  return false;
}

/**
 * Calculate a matching score between query keywords and a tool
 * Higher score indicates better match
 */
export function calculateToolMatchScore(
  keywords: string[],
  tool: { name?: string; description?: string; keywords?: string[] },
): number {
  let score = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // 1. Check tool keywords (highest weight)
    if (tool.keywords) {
      if (tool.keywords.some(k => k.toLowerCase().includes(keywordLower))) {
        score += 3;
      }
    }
    
    // 2. Check tool name (medium weight)
    if (tool.name && tool.name.toLowerCase().includes(keywordLower)) {
      score += 2;
    }
    
    // 3. Check tool description (lowest weight)
    if (tool.description && tool.description.toLowerCase().includes(keywordLower)) {
      score += 1;
    }
  }
  
  return score;
}

/**
 * Extract tool-like patterns from query
 * Useful for identifying potential tool names in the query
 */
export function extractToolPatterns(query: string): string[] {
  const patterns: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Common tool name patterns
  const toolPatterns = [
    /\b(get|fetch|query|search|find|list|create|update|delete|send|post|read|write)-[a-z]+\b/g,
    /\b(open|close|start|stop|run|execute|call|invoke)-[a-z]+\b/g,
    /\b(analyze|process|transform|generate|make|build|construct)-[a-z]+\b/g,
  ];
  
  for (const pattern of toolPatterns) {
    const matches = queryLower.match(pattern) || [];
    patterns.push(...matches);
  }
  
  return [...new Set(patterns)];
}