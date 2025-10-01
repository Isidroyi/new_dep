import React from 'react';
import { RequirementDetail, ComplianceResult } from '../types';
import { TrashIcon } from './icons';
import StatusPill from './StatusPill';
import ValueComparer from './ValueComparer'; // <-- ИМПОРТ

interface ResultsDisplayProps {
  results: (RequirementDetail | ComplianceResult)[];
  headers: Record<keyof ComplianceResult, string>;
  isVerified: boolean;
  onUpdate: (index: number, field: keyof ComplianceResult, value: string) => void;
  onHeaderUpdate: (field: keyof ComplianceResult, value: string) => void;
  onDelete: (id: number) => void;
  onAddRow: () => void;
  onGoToPage: (page: number, documentName?: string) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, headers, isVerified, onUpdate, onHeaderUpdate, onDelete, onAddRow, onGoToPage }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        Нет данных для отображения.
      </div>
    );
  }

  const handleCellBlur = (index: number, field: keyof ComplianceResult, e: React.FocusEvent<HTMLTableCellElement>) => {
    onUpdate(index, field, e.currentTarget.textContent || '');
  };

  const handleHeaderBlur = (field: keyof ComplianceResult, e: React.FocusEvent<HTMLTableCellElement>) => {
    onHeaderUpdate(field, e.currentTarget.textContent || '');
  };

  const computedHeaders = React.useMemo(() => {
    const clone = { ...headers } as Record<string, string>;
    if (!isVerified) {
      delete clone.actualValue;
      delete clone.status;
      delete clone.explanation;
      delete clone.pageNumber;
      delete clone.bestDocument;
    }
    return clone as Record<keyof ComplianceResult, string>;
  }, [headers, isVerified]);

  // Скрываем pageNumber из заголовков
  const displayHeaders = { ...computedHeaders };
  delete (displayHeaders as any).pageNumber;

  return (
    <div className="mt-12 bg-slate-800/50 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <h2 className="text-2xl font-bold p-6 text-slate-100 border-b border-slate-700">
        {isVerified ? 'Результаты верификации' : 'Извлеченные требования'}
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800">
            <tr>
              {Object.keys(displayHeaders).map((key) => (
                <th
                  key={key}
                  scope="col"
                  contentEditable={key !== 'id'}
                  suppressContentEditableWarning
                  onBlur={(e) => handleHeaderBlur(key as keyof ComplianceResult, e)}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider ${key === 'id' ? 'w-16' : ''} ${key !== 'id' ? 'focus:outline-none focus:bg-slate-700/50 rounded-md' : ''}`}
                >
                  {headers[key as keyof ComplianceResult]}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {results.map((result, index) => (
              <tr key={result.id} className="hover:bg-slate-800 transition-colors duration-200 group">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 align-top">{result.id}</td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleCellBlur(index, 'parameter', e)}
                  className="px-6 py-4 whitespace-normal text-sm font-medium text-slate-200 max-w-xs focus:outline-none focus:bg-slate-700/50 rounded-md align-top"
                >{result.parameter}</td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleCellBlur(index, 'requirement', e)}
                  className="px-6 py-4 whitespace-normal text-sm text-slate-300 focus:outline-none focus:bg-slate-700/50 rounded-md align-top"
                >{result.requirement}</td>
                 <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleCellBlur(index, 'source', e)}
                  className="px-6 py-4 whitespace-normal text-sm text-slate-300 focus:outline-none focus:bg-slate-700/50 rounded-md align-top"
                >{result.source}</td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleCellBlur(index, 'notes', e)}
                  className="px-6 py-4 whitespace-normal text-sm text-slate-400 max-w-sm focus:outline-none focus:bg-slate-700/50 rounded-md align-top"
                >{result.notes}</td>

                {isVerified && 'status' in result && (
                  <>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleCellBlur(index, 'bestDocument', e)}
                      className="px-6 py-4 whitespace-normal text-sm text-slate-300 focus:outline-none focus:bg-slate-700/50 rounded-md align-top"
                    >{(result as ComplianceResult).bestDocument || '—'}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-slate-300 focus:outline-none focus:bg-slate-700/50 rounded-md align-top">
                      <ValueComparer
                        requirement={result.requirement}
                        actualValue={(result as ComplianceResult).actualValue}
                        status={(result as ComplianceResult).status}
                        bestDocument={(result as ComplianceResult).bestDocument}
                        comparisons={(result as ComplianceResult).comparisons}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-slate-300 align-top">
                      <StatusPill status={(result as ComplianceResult).status} />
                    </td>
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleCellBlur(index, 'explanation', e)}
                      // <-- ДЕЛАЕМ ПОЯСНЕНИЕ КЛИКАБЕЛЬНЫМ
                      onClick={() => (result as ComplianceResult).pageNumber > 0 && onGoToPage((result as ComplianceResult).pageNumber, (result as ComplianceResult).bestDocument)}
                      className={`px-6 py-4 whitespace-normal text-sm text-slate-400 max-w-sm focus:outline-none focus:bg-slate-700/50 rounded-md align-top ${(result as ComplianceResult).pageNumber > 0 ? 'cursor-pointer hover:text-sky-400 transition-colors' : ''}`}
                      title={(result as ComplianceResult).pageNumber > 0 ? `Перейти на страницу ${(result as ComplianceResult).pageNumber}` : ''}
                    >{(result as ComplianceResult).explanation}</td>
                  </>
                )}

                <td className="px-6 py-4 whitespace-nowrap text-center text-sm align-top">
                  <button onClick={() => onDelete(result.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <button
          onClick={onAddRow}
          className="w-full sm:w-auto bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-300"
        >
          Добавить строку
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;