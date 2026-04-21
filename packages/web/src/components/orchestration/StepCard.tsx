import React from 'react';
import { 
  Server, 
  Wrench, 
  GitCommit, 
  Repeat, 
  Settings, 
  ChevronRight,
  MoreVertical,
  Trash2
} from 'lucide-react';
import type { WorkflowStep } from '../../types';

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  onDelete?: (id: string) => void;
  onEdit?: (step: WorkflowStep) => void;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, onDelete, onEdit }) => {
  const getIcon = () => {
    const stepType = step.type || 'tool';
    switch (stepType) {
      case 'server': return <Server className="w-5 h-5" />;
      case 'tool': return <Wrench className="w-5 h-5" />;
      case 'condition': return <GitCommit className="w-5 h-5" />;
      case 'loop': return <Repeat className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getBadgeColor = () => {
    const stepType = step.type || 'tool';
    switch (stepType) {
      case 'server': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'tool': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'condition': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'loop': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="card hover:shadow-md transition-all border-l-4 border-l-primary-500 relative group">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getBadgeColor()}`}>
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {index + 1}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getBadgeColor()}`}>
                {(step.type || 'tool').toUpperCase()}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {step.toolName || step.serverName || 'Unnamed Step'}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit?.(step)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete?.(step.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 pl-11 space-y-2">
        {step.serverName && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium mr-2">Server:</span>
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">{step.serverName}</code>
          </div>
        )}
        
        {step.parameters && Object.keys(step.parameters).length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Parameters:</div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
              <pre>{JSON.stringify(step.parameters, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {step.nextSteps && step.nextSteps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center text-xs text-gray-500">
          <ChevronRight className="w-3 h-3 mr-1" />
          Next: {step.nextSteps.join(', ')}
        </div>
      )}
    </div>
  );
};

export default StepCard;
