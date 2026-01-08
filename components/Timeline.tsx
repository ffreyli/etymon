import React from 'react';
import { TimelineStep } from '../types';
import { ArrowDown, Clock, BookOpen, GitCommit } from 'lucide-react';
import { GRAPH_NODE_COLORS } from '../constants';

interface TimelineProps {
  timeline: TimelineStep[];
  onStepClick: (step: TimelineStep) => void;
  selectedWord?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ timeline, onStepClick, selectedWord }) => {
  return (
    <div className="w-full max-w-md mx-auto py-4 px-2 space-y-0">
      {timeline.map((step, index) => {
        const isLast = index === timeline.length - 1;
        const isSelected = selectedWord === step.word;
        
        // Define border color based on type
        const typeColor = GRAPH_NODE_COLORS[step.type as keyof typeof GRAPH_NODE_COLORS] || '#a8a29e';

        return (
          <div key={`${step.word}-${index}`} className="relative flex gap-6 group">
            {/* Connector Line */}
            {!isLast && (
              <div 
                className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-stone-300 group-hover:bg-stone-400 transition-colors"
                aria-hidden="true"
              />
            )}

            {/* Icon / Dot */}
            <div className="flex-shrink-0 mt-1 relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[#fdfbf7] ${isSelected ? 'ring-2 ring-stone-400 shadow-md scale-110' : ''}`}
                style={{ borderColor: typeColor }}
              >
                {step.type === 'root' ? (
                  <GitCommit size={18} style={{ color: typeColor }} />
                ) : step.type === 'current' ? (
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: typeColor }} />
                ) : (
                  <span className="text-sm font-serif font-bold text-stone-500">{index + 1}</span>
                )}
              </div>
            </div>

            {/* Content Card */}
            <div 
              className={`flex-1 mb-8 p-5 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-white border-stone-400 shadow-md' : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'}`}
              onClick={() => onStepClick(step)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 font-sans tracking-wide">
                  {step.language}
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-400 font-serif italic">
                  <Clock size={12} />
                  {step.era}
                </span>
              </div>
              
              <div className="mb-2">
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  {step.word}
                </h3>
                {step.transliteration && (
                  <p className="text-sm font-serif italic text-stone-500">
                    {step.transliteration}
                  </p>
                )}
              </div>
              
              <div className="flex items-start gap-2 mb-3 bg-stone-50 p-2 rounded">
                <BookOpen size={16} className="mt-0.5 text-stone-400 flex-shrink-0" />
                <p className="text-base text-stone-700 font-serif italic">"{step.meaning}"</p>
              </div>

              {step.description && (
                <p className="text-sm text-stone-600 leading-relaxed font-serif">
                  {step.description}
                </p>
              )}
              
              <div className="mt-3 flex justify-end border-t border-stone-100 pt-2">
                 <span className="text-[10px] uppercase tracking-wider font-bold font-sans" style={{color: typeColor}}>
                     {step.type}
                 </span>
              </div>
            </div>
          </div>
        );
      })}
      
      {timeline.length === 0 && (
          <div className="text-center py-10 text-stone-400 font-serif italic">
              No timeline data available.
          </div>
      )}
    </div>
  );
};