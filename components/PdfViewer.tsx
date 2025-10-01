import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// --- ИЗМЕНЕНИЕ: Исправлены пути для CSS-файлов ---
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Status } from '../types';

// Worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfConditionRow {
  title: string;
  value: string;
  status: Status;
  notes?: string;
}

interface PdfViewerProps {
  file: File;
  page: number | null;
  conditions?: PdfConditionRow[];
}

const statusClasses: Record<Status, string> = {
  [Status.CONFORMS]: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  [Status.DOES_NOT_CONFORM]: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
  [Status.PARTIAL_CONFORMANCE]: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  [Status.NOT_FOUND]: 'bg-slate-600/30 text-slate-300 border border-slate-500/40',
};

const PdfViewer: React.FC<PdfViewerProps> = ({ file, page, conditions }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showConditions, setShowConditions] = useState(false);

  useEffect(() => {
    if (page && page > 0 && page <= (numPages || 0)) {
      setCurrentPage(page);
    }
  }, [page, numPages]);

  useEffect(() => {
    setShowConditions(false);
  }, [file, conditions]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const goToPrevPage = () => setCurrentPage(prev => (prev > 1 ? prev - 1 : 1));
  const goToNextPage = () => setCurrentPage(prev => (numPages ? (prev < numPages ? prev + 1 : numPages) : 1));

  return (
    <div className="mt-8 border border-slate-700 rounded-lg bg-slate-800/50 shadow-lg">
      <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 truncate pr-4" title={file.name}>
          {file.name}
        </h3>
        {numPages && (
          <div className="flex items-center gap-4">
            <button onClick={goToPrevPage} disabled={currentPage <= 1} className="px-3 py-1 bg-slate-700 rounded-md disabled:opacity-50 hover:bg-slate-600 transition-colors">&lt;</button>
            <span className="text-slate-400 text-sm">
              Стр. {currentPage} из {numPages}
            </span>
            <button onClick={goToNextPage} disabled={currentPage >= numPages} className="px-3 py-1 bg-slate-700 rounded-md disabled:opacity-50 hover:bg-slate-600 transition-colors">&gt;</button>
          </div>
        )}
      </div>
      <div className="max-h-[70vh] overflow-auto flex justify-center p-4">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-slate-400">Загрузка документа...</div>}
          error={<div className="text-red-400">Ошибка при загрузке PDF.</div>}
        >
          <Page pageNumber={currentPage} />
        </Document>
      </div>
      {Array.isArray(conditions) && conditions.length > 0 && (
        <div className="border-t border-slate-700 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setShowConditions((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <span>Таблица условий поставки</span>
            <span className="text-slate-400">{showConditions ? 'Скрыть' : 'Показать'}</span>
          </button>
          {showConditions && (
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200 border border-slate-700/60">
                <thead className="bg-slate-800/60">
                  <tr>
                    <th className="px-3 py-2 font-semibold border-b border-slate-700/60">Параметр</th>
                    <th className="px-3 py-2 font-semibold border-b border-slate-700/60">Значение</th>
                    <th className="px-3 py-2 font-semibold border-b border-slate-700/60">Статус</th>
                    {conditions.some((row) => row.notes) && (
                      <th className="px-3 py-2 font-semibold border-b border-slate-700/60">Комментарий</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {conditions.map((row) => (
                    <tr key={row.title} className="odd:bg-slate-800/40 even:bg-slate-900/40">
                      <td className="px-3 py-2 align-top text-slate-300 whitespace-nowrap">{row.title}</td>
                      <td className="px-3 py-2 align-top text-slate-100">{row.value}</td>
                      <td className="px-3 py-2 align-top">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      {conditions.some((item) => item.notes) && (
                        <td className="px-3 py-2 align-top text-slate-300">
                          {row.notes || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;