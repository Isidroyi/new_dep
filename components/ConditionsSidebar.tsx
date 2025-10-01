import React from 'react';
import { Status } from '../types';
import StatusPill from './StatusPill';

export interface ConditionSidebarItem {
  title: string;
  requirement: string;
  actualValue?: string;
  bestDocument?: string;
  status?: Status;
  explanation?: string;
}

interface ConditionsSidebarProps {
  items: ConditionSidebarItem[];
}

const ConditionsSidebar: React.FC<ConditionsSidebarProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <aside className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">Ключевые условия</h3>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-slate-900/40 border border-slate-700/70 rounded-lg p-3 shadow-inner"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                {item.bestDocument && (
                  <p className="text-xs text-slate-500 mt-1">
                    Лучший документ: <span className="text-slate-300">{item.bestDocument}</span>
                  </p>
                )}
              </div>
              {item.status && <StatusPill status={item.status} />}
            </div>
            <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">Факт</div>
            <p
              className={`text-sm whitespace-pre-line ${
                item.actualValue
                  ? 'text-sky-200 bg-sky-500/10 border border-sky-500/30 rounded-md px-2 py-1'
                  : 'text-slate-500'
              }`}
            >
              {item.actualValue || 'Не указано в документе'}
            </p>
            {item.explanation && (
              <p className="mt-3 text-xs text-slate-500 whitespace-pre-line">
                {item.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ConditionsSidebar;
