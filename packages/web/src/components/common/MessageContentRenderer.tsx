import React from 'react';
import JsonRenderer from './JsonRenderer';

interface MessageContentRendererProps {
  content: string;
  role: 'user' | 'assistant';
}

const MessageContentRenderer: React.FC<MessageContentRendererProps> = ({ content }) => {
  // Parse JSON renderer markers
  const parseJsonRenderers = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Find all JSON renderer markers
    const regex = /<!-- JSON_RENDERER_START:([^ ]+) -->[\s\S]*?<!-- JSON_RENDERER_END -->/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the marker
      if (match.index > lastIndex) {
        parts.push(renderMarkdown(text.substring(lastIndex, match.index)));
      }
      
      // Parse and render the JSON
      try {
        const jsonData = JSON.parse(atob(match[1]));
        parts.push(
          <div key={`json-${match.index}`} className="my-2">
            <JsonRenderer 
              data={jsonData} 
              maxHeight="300px"
              showControls={true}
              theme="auto"
            />
          </div>
        );
      } catch (error) {
        console.error('Failed to parse JSON renderer data:', error);
        parts.push(
          <div key={`json-error-${match.index}`} className="text-red-500 text-sm">
            Failed to render JSON data
          </div>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(renderMarkdown(text.substring(lastIndex)));
    }
    
    return parts;
  };

  // Simple markdown renderer for bold text
  const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // Handle bold text (**text**)
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before the bold
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        
        // Add bold text
        parts.push(
          <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">
            {match[1]}
          </strong>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      // Handle emojis and other formatting
      const formattedLine = parts.map((part, partIndex) => {
        if (typeof part === 'string') {
          // Replace emoji placeholders with actual emojis
          const emojiMap: Record<string, string> = {
            '🚄': '🚄',
            '📊': '📊',
            '📝': '📝',
            '💡': '💡',
            '🔧': '🔧',
            '✅': '✅',
            '❌': '❌',
            '⚠️': '⚠️',
            '🎉': '🎉',
            '📋': '📋',
            '⏰': '⏰',
            '🔄': '🔄',
            '⏭️': '⏭️',
            '❓': '❓',
          };
          
          let textWithEmojis = part;
          Object.entries(emojiMap).forEach(([placeholder, emoji]) => {
            textWithEmojis = textWithEmojis.replace(new RegExp(placeholder, 'g'), emoji);
          });
          
          return <span key={`text-${lineIndex}-${partIndex}`}>{textWithEmojis}</span>;
        }
        return part;
      });
      
      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {formattedLine}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // Check if content contains JSON renderer markers
  const hasJsonRenderers = content.includes('<!-- JSON_RENDERER_START:');
  
  if (hasJsonRenderers) {
    return <div className="whitespace-pre-wrap">{parseJsonRenderers(content)}</div>;
  }
  
  return <div className="whitespace-pre-wrap">{renderMarkdown(content)}</div>;
};

export default MessageContentRenderer;