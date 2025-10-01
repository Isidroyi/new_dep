import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RequirementDetail, ComplianceResult, Status } from './types';
import { extractEntities, verifyRequirements } from './services/geminiService';
import FileUploadCard from './components/FileUploadCard';
import ResultsDisplay from './components/ResultsDisplay';
import Spinner from './components/Spinner';
import Header from './components/Header';
import PdfViewer from './components/PdfViewer';
import AnalyticsDashboard from './components/AnalyticsDashboard'; // <-- ИМПОРТ
import ConditionsSidebar, { ConditionSidebarItem } from './components/ConditionsSidebar';

type AppStep = 'EXTRACT' | 'VERIFY' | 'DONE';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(() => (localStorage.getItem('appStep') as AppStep) || 'EXTRACT');
  const [analysisResults, setAnalysisResults] = useState<(RequirementDetail | ComplianceResult)[] | null>(
    () => JSON.parse(localStorage.getItem('analysisResults') || 'null')
  );
  const [conditionResults, setConditionResults] = useState<ComplianceResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('conditionResults') || '[]');
    } catch (error) {
      console.warn('Не удалось восстановить conditionResults из localStorage', error);
      return [];
    }
  });
  
  const [requirementsFile, setRequirementsFile] = useState<File | null>(null);
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionLimit, setExtractionLimit] = useState<number | undefined>();
  const [pdfPage, setPdfPage] = useState<number | null>(null);
  const [headers, setHeaders] = useState<Record<keyof ComplianceResult, string>>({
    id: "ID",
    parameter: "Параметр",
    requirement: "Требование",
    source: "Источник",
    notes: "Примечания",
    bestDocument: "Лучший документ",
    actualValue: "Факт. значение",
    status: "Статус",
    explanation: "Пояснение ИИ",
    pageNumber: "Стр."
  });

  // --- НОВОЕ: Логика таймера ---
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading]);
  // --- КОНЕЦ ЛОГИКИ ТАЙМЕРА ---

  useEffect(() => {
    localStorage.setItem('appStep', step);
    if (analysisResults) {
      localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
    } else {
      localStorage.removeItem('analysisResults');
    }
    if (conditionResults.length > 0) {
      localStorage.setItem('conditionResults', JSON.stringify(conditionResults));
    } else {
      localStorage.removeItem('conditionResults');
    }
  }, [step, analysisResults, conditionResults]);

  useEffect(() => {
    if (verificationFiles.length === 0) {
      setActiveVerificationIndex(0);
      setPdfPage(null);
      return;
    }
    if (activeVerificationIndex >= verificationFiles.length) {
      setActiveVerificationIndex(verificationFiles.length - 1);
      setPdfPage(1);
    }
  }, [verificationFiles, activeVerificationIndex]);

  const handleExtraction = useCallback(async () => {
    if (!requirementsFile) {
      setError('Пожалуйста, загрузите документ с требованиями.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResults(null);
    setConditionResults([]);
    try {
      const results = await extractEntities(requirementsFile, extractionLimit);
      if (results && results.length > 0) {
        setAnalysisResults(results);
        setStep('VERIFY');
      } else {
        setError('Не удалось извлечь требования из документа.');
      }
    } catch (err: any) {
      setError((err as Error).message || 'Произошла ошибка при извлечении.');
    } finally {
      setIsLoading(false);
    }
  }, [requirementsFile, extractionLimit]);

  const handleVerificationFilesSelect = useCallback((files: File[]) => {
    setVerificationFiles(files);
    setActiveVerificationIndex(0);
    setPdfPage(files.length > 0 ? 1 : null);
  }, []);

  const handleSelectVerificationFile = useCallback((index: number) => {
    setActiveVerificationIndex(index);
    setPdfPage(1);
  }, []);

  const handleVerification = useCallback(async () => {
    if (verificationFiles.length === 0 || !analysisResults) {
      setError('Загрузите документы для верификации.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setConditionResults([]);
    try {
      const results = await verifyRequirements(verificationFiles, analysisResults as RequirementDetail[]);
      if (results && results.length > 0) {
        const conditionRows = results.filter((result) => result.source === 'Системная проверка');
        const primaryRows = results.filter((result) => result.source !== 'Системная проверка');

        setConditionResults(conditionRows);
        setAnalysisResults(primaryRows);
        setStep('DONE');
      } else {
        setError('Верификация завершена, но совпадений не найдено.');
      }
    } catch (err: any) {
      setError((err as Error).message || 'Произошла ошибка во время верификации.');
    } finally {
      setIsLoading(false);
    }
  }, [verificationFiles, analysisResults]);
    
  const handleStartOver = useCallback(() => {
    setStep('EXTRACT');
    setAnalysisResults(null);
    setRequirementsFile(null);
    setVerificationFiles([]);
    setActiveVerificationIndex(0);
    setError(null);
    setPdfPage(null);
    setConditionResults([]);
    localStorage.removeItem('appStep');
    localStorage.removeItem('analysisResults');
    localStorage.removeItem('conditionResults');
  }, []);

  // ... (остальные хендлеры остаются без изменений) ...
  const handleResultUpdate = useCallback((index: number, field: keyof ComplianceResult, value: string) => {
    setAnalysisResults(prevResults => {
      if (!prevResults) return null;
      const newResults = [...prevResults];
      (newResults[index] as any)[field] = value;
      return newResults;
    });
  }, []);

  const handleHeaderUpdate = useCallback((field: keyof ComplianceResult, value: string) => {
    setHeaders(prevHeaders => ({ ...prevHeaders, [field]: value }));
  }, []);

  const handleDeleteResult = useCallback((idToDelete: number) => {
    setAnalysisResults(prevResults => (prevResults || []).filter(result => result.id !== idToDelete));
  }, []);

  const handleAddRow = useCallback(() => {
    setAnalysisResults(prevResults => {
      const results = prevResults || [];
      const newId = results.length > 0 ? Math.max(...results.map(r => r.id)) + 1 : 1;
      const newRow = step === 'DONE'
        ? { id: newId, parameter: '', requirement: '', source: '', notes: '', bestDocument: '', actualValue: '', status: Status.NOT_FOUND, explanation: '', pageNumber: 0 }
        : { id: newId, parameter: '', requirement: '', source: '', notes: '' };
      return [...results, newRow];
    });
  }, [step]);
    
  const handleExport = useCallback(() => {
     if (!analysisResults) return;

    const escapeCsv = (str: string | number) => {
        const text = String(str);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };
      
    const headerKeys = Object.keys(headers).filter(k => k !== 'pageNumber') as (keyof ComplianceResult)[];
    const headerRow = headerKeys.map(key => escapeCsv(headers[key])).join(',');
    
    const dataRows = analysisResults.map(row => {
        return headerKeys.map(key => {
            if (key in row) {
                return escapeCsv(row[key as keyof typeof row]);
            }
            return '';
        }).join(',');
    }).join('\n');

    const csvContent = `\uFEFF${headerRow}\n${dataRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'verification_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [analysisResults, headers]);
    
  const handleGoToPage = useCallback((page: number, documentName?: string) => {
      if (documentName) {
        const targetIndex = verificationFiles.findIndex(file => file.name === documentName);
        if (targetIndex !== -1) {
          setActiveVerificationIndex(targetIndex);
        }
      }
      setPdfPage(page);
  }, [verificationFiles]);

  const hasVerificationFiles = verificationFiles.length > 0;
  const activeVerificationFile = hasVerificationFiles
    ? verificationFiles[Math.min(activeVerificationIndex, verificationFiles.length - 1)]
    : null;

  const conditionHighlights = useMemo<ConditionSidebarItem[]>(() => {
    if (step !== 'DONE') {
      return [];
    }

    const combined = [
      ...conditionResults,
      ...(((analysisResults || []) as ComplianceResult[]))
    ];

    if (combined.length === 0) {
      return [];
    }

    const targets = [
      { title: 'Условия поставки', keywords: ['условия поставки'] },
      { title: 'Срок поставки', keywords: ['срок поставки'] },
      { title: 'Условия оплаты', keywords: ['условия оплаты'] },
    ];

    return targets
      .map((target) => {
        const match = combined.find((result) => {
          const parameter = (result.parameter || '').toLowerCase();
          const requirementText = (result.requirement || '').toLowerCase();
          const actual = (result.actualValue || '').toLowerCase();
          return target.keywords.some((keyword) =>
            parameter.includes(keyword) || requirementText.includes(keyword) || actual.includes(keyword)
          );
        });

        if (!match) {
          return null;
        }

        return {
          title: target.title,
          requirement: match.source === 'Системная проверка' ? target.title : (match.requirement || target.title),
          actualValue: match.actualValue,
          bestDocument: match.bestDocument,
          status: match.status,
          explanation: match.explanation,
        } as ConditionSidebarItem;
      })
      .filter((item): item is ConditionSidebarItem => item !== null);
  }, [analysisResults, conditionResults, step]);

  const perDocumentConditions = useMemo<Record<string, { title: string; value: string; status: Status; notes?: string }[]>>(() => {
    if (step !== 'DONE' || !hasVerificationFiles) {
      return {};
    }

    const combined = [
      ...conditionResults,
      ...(((analysisResults || []) as ComplianceResult[]))
    ];

    const targets = [
      { title: 'Условия поставки', keywords: ['условия поставк'] },
      { title: 'Срок поставки', keywords: ['срок поставк', 'срок достав'] },
      { title: 'Условия оплаты', keywords: ['условия оплат', 'оплат'] },
    ];

    const docMap: Record<string, { title: string; value: string; status: Status; notes?: string }[]> = {};

    combined.forEach((result) => {
      const parameter = (result.parameter || '').toLowerCase();
      const requirementText = (result.requirement || '').toLowerCase();
      const target = targets.find((candidate) =>
        candidate.keywords.some((keyword) => parameter.includes(keyword) || requirementText.includes(keyword))
      );

      if (!target || !Array.isArray(result.comparisons)) {
        return;
      }

      result.comparisons.forEach((offer) => {
        if (!docMap[offer.documentName]) {
          docMap[offer.documentName] = [];
        }

        docMap[offer.documentName] = [
          ...docMap[offer.documentName].filter((item) => item.title !== target.title),
          {
            title: target.title,
            value: offer.actualValue || 'Не указано в документе',
            status: offer.status,
            notes: offer.notes,
          },
        ];
      });
    });

    verificationFiles.forEach((file) => {
      const existing = docMap[file.name] ?? [];
      docMap[file.name] = targets.map((target) => {
        const found = existing.find((item) => item.title === target.title);
        return found ?? { title: target.title, value: 'Не указано в документе', status: Status.NOT_FOUND };
      });
    });

    return docMap;
  }, [analysisResults, conditionResults, hasVerificationFiles, step, verificationFiles]);

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <main className="container mx-auto px-4 py-8">
        <Header />
        
        <div className="max-w-7xl mx-auto mt-8">
           <div className={`grid grid-cols-1 ${step !== 'EXTRACT' ? 'md:grid-cols-2' : ''} gap-8 mb-8`}>
            <FileUploadCard
              id="req-upload"
              title="Шаг 1: Документ с требованиями"
              description="Загрузите Excel, PDF или изображение с перечнем требований."
              file={requirementsFile}
              onFileSelect={setRequirementsFile}
              accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/png,image/jpeg,image/webp"
            />
            {step !== 'EXTRACT' && (
              <FileUploadCard
                id="ver-upload"
                title="Шаг 2: Коммерческие предложения"
                description="Загрузите один или несколько PDF-файлов с предложениями от поставщиков."
                files={verificationFiles}
                multiple
                onFilesSelect={handleVerificationFilesSelect}
                accept="application/pdf"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
             {step === 'EXTRACT' && (
                <>
                    <div className="flex items-center gap-3">
                        <label htmlFor="limit-input" className="text-slate-400 text-sm flex-shrink-0">Лимит строк:</label>
                        <input
                            id="limit-input"
                            type="number"
                            min="1"
                            value={extractionLimit || ''}
                            onChange={(e) => setExtractionLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            placeholder="Все"
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 w-24 p-2.5"
                        />
                    </div>
                    <button
                        onClick={handleExtraction}
                        disabled={!requirementsFile || isLoading}
                        className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-12 rounded-lg transition-all duration-300 shadow-lg shadow-sky-900/50 transform hover:scale-105 w-full sm:w-auto"
                    >
                        {isLoading ? 'Извлечение...' : 'Извлечь требования'}
                    </button>
                </>
             )}
             {step === 'VERIFY' && (
                 <button
                    onClick={handleVerification}
          disabled={verificationFiles.length === 0 || isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-12 rounded-lg transition-all duration-300 shadow-lg shadow-emerald-900/50 transform hover:scale-105"
                >
                    {isLoading ? 'Верификация...' : 'Проверить соответствие'}
                </button>
             )}
             {step === 'DONE' && (
                <button
                    onClick={handleExport}
                    disabled={!analysisResults || analysisResults.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-12 rounded-lg transition-all duration-300 shadow-lg shadow-indigo-900/50 transform hover:scale-105"
                >
                    Экспорт в CSV
                </button>
             )}
             {step !== 'EXTRACT' && (
                <button
                    onClick={handleStartOver}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-12 rounded-lg transition-all"
                >
                    Начать заново
                </button>
             )}
          </div>

          {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
              <span className="font-bold">Ошибка:</span> {error}
            </div>
          )}

          {isLoading && <Spinner mode={step === 'EXTRACT' ? 'extraction' : 'verification'} timer={timer} />}

          {/* --- НОВОЕ: Отображение дашборда с метриками --- */}
          {step === 'DONE' && analysisResults && (
             <AnalyticsDashboard results={analysisResults as ComplianceResult[]} />
          )}
          
          <div className={`mt-8 grid ${hasVerificationFiles && (step === 'VERIFY' || step === 'DONE') ? 'grid-cols-1 lg:grid-cols-2 gap-8' : 'grid-cols-1'}`}>
            <div className="lg:col-span-1">
              {analysisResults && analysisResults.length > 0 && (
                <ResultsDisplay
                  results={analysisResults}
                  headers={headers}
                  isVerified={step === 'DONE' || (step === 'VERIFY' && analysisResults.length > 0 && 'status' in analysisResults[0])}
                  onUpdate={handleResultUpdate}
                  onHeaderUpdate={handleHeaderUpdate}
                  onDelete={handleDeleteResult}
                  onAddRow={handleAddRow}
                  onGoToPage={handleGoToPage}
                />
              )}
            </div>
            {hasVerificationFiles && (step === 'VERIFY' || step === 'DONE') && activeVerificationFile && (
              <div className="lg:col-span-1 flex flex-col gap-4">
                {verificationFiles.length > 1 && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-2">Документы поставщиков</h3>
                    <div className="flex flex-wrap gap-2">
                      {verificationFiles.map((file, index) => {
                        const isActive = index === activeVerificationIndex;
                        return (
                          <button
                            key={`${file.name}-${index}`}
                            type="button"
                            onClick={() => handleSelectVerificationFile(index)}
                            className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors duration-200 ${
                              isActive
                                ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                                : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-sky-500/60'
                            }`}
                          >
                            {file.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <PdfViewer
                  file={activeVerificationFile}
                  page={pdfPage}
                  conditions={perDocumentConditions[activeVerificationFile.name]}
                />
                {conditionHighlights.length > 0 && (
                  <ConditionsSidebar items={conditionHighlights} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;