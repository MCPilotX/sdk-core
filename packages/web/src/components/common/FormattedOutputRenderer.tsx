/**
 * Formatted Output Renderer
 * 
 * Smart component that renders formatted output based on formatting result.
 * Can render text, markdown, or visual components like JsonRenderer.
 */

import React from 'react';
import JsonRenderer from './JsonRenderer';
import type { FormattingResult } from '../../services/output-formatting/types';
import { RenderingType } from '../../services/output-formatting/types';

interface FormattedOutputRendererProps {
  /** Formatting result from OutputFormattingService */
  formattingResult: FormattingResult;
  
  /** Whether to show debug information */
  debug?: boolean;
  
  /** Custom renderers for specific rendering types */
  customRenderers?: Record<string, React.ComponentType<any>>;
  
  /** Additional props to pass to renderers */
  rendererProps?: Record<string, any>;
}

const FormattedOutputRenderer: React.FC<FormattedOutputRendererProps> = ({
  formattingResult,
  debug = false,
  customRenderers = {},
  rendererProps = {}
}) => {
  const { output, visualRendering, dataType, formatterId, confidence } = formattingResult;
  
  // Check if we should use visual rendering
  const shouldUseVisualRendering = visualRendering && 
    visualRendering.renderingType !== RenderingType.TEXT;
  
  // Render based on rendering type
  const renderContent = () => {
    if (!shouldUseVisualRendering) {
      // Render as markdown text
      return renderMarkdown(output);
    }
    
    // Use visual rendering
    switch (visualRendering!.renderingType) {
      case RenderingType.JSON_VISUAL:
        return renderJsonVisual(visualRendering!);
        
      case RenderingType.TABLE_VISUAL:
        return renderTableVisual(visualRendering!);
        
      case RenderingType.HTML:
        return renderHtml(visualRendering!);
        
      case RenderingType.MARKDOWN:
        return renderMarkdown(output);
        
      default:
        // Fallback to text
        return renderMarkdown(output);
    }
  };
  
  // Render JSON with JsonRenderer component
  const renderJsonVisual = (visualRendering: any) => {
    const { rawData, options = {} } = visualRendering;
    
    // Check for custom renderer
    if (customRenderers.json) {
      const CustomRenderer = customRenderers.json;
      return <CustomRenderer data={rawData} {...options} {...rendererProps} />;
    }
    
    // Use default JsonRenderer
    return (
      <div className="mt-4">
        <JsonRenderer 
          data={rawData} 
          title={options.title}
          maxHeight={options.maxHeight || '400px'}
          showControls={options.showControls !== false}
          theme={options.theme || 'auto'}
          {...rendererProps}
        />
      </div>
    );
  };
  
  // Render table (placeholder - would need a TableRenderer component)
  const renderTableVisual = (visualRendering: any) => {
    const { rawData, options = {} } = visualRendering;
    
    // Check for custom renderer
    if (customRenderers.table) {
      const CustomRenderer = customRenderers.table;
      return <CustomRenderer data={rawData} {...options} {...rendererProps} />;
    }
    
    // Fallback to JSON rendering for now
    return (
      <div className="mt-4">
        <JsonRenderer 
          data={rawData} 
          title={options.title || 'Table Data'}
          maxHeight={options.maxHeight || '400px'}
          showControls={options.showControls !== false}
          {...rendererProps}
        />
      </div>
    );
  };
  
  // Render HTML (with sanitization)
  const renderHtml = (visualRendering: any) => {
    const { rawData, options = {} } = visualRendering;
    
    // Check for custom renderer
    if (customRenderers.html) {
      const CustomRenderer = customRenderers.html;
      return <CustomRenderer data={rawData} {...options} {...rendererProps} />;
    }
    
    // Simple HTML rendering (be careful with XSS!)
    // In production, you should use a library like DOMPurify
    return (
      <div 
        className="html-content mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto"
        style={{ maxHeight: options.maxHeight || '400px' }}
        dangerouslySetInnerHTML={{ __html: rawData }}
      />
    );
  };
  
  // Render markdown text
  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    // In production, you should use a library like react-markdown
    const processedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    
    return (
      <div className="markdown-content">
        <p dangerouslySetInnerHTML={{ __html: `<p>${processedText}</p>` }} />
      </div>
    );
  };
  
  return (
    <div className="formatted-output-renderer">
      {/* Debug information */}
      {debug && (
        <div className="debug-info mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Formatter:</span> {formatterId}
            </div>
            <div>
              <span className="font-medium">Confidence:</span> {confidence.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Data Type:</span> {dataType}
            </div>
            <div>
              <span className="font-medium">Visual Rendering:</span> {shouldUseVisualRendering ? 'Yes' : 'No'}
            </div>
            {shouldUseVisualRendering && (
              <div className="col-span-2">
                <span className="font-medium">Rendering Type:</span> {visualRendering!.renderingType}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="content">
        {renderContent()}
      </div>
      
      {/* Visual rendering indicator */}
      {shouldUseVisualRendering && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
          </svg>
          Interactive view available
        </div>
      )}
    </div>
  );
};

export default FormattedOutputRenderer;