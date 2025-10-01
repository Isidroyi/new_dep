import React, { useMemo } from 'react';
import { ComplianceResult, Status } from '../types';

interface AnalyticsDashboardProps {
  results: ComplianceResult[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ results }) => {
  const stats = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        total: 0,
        conforms: 0,
        doesNotConform: 0,
        partial: 0,
        notFound: 0,
        complianceRate: 0,
      };
    }

    const total = results.length;
    const conforms = results.filter(r => r.status === Status.CONFORMS).length;
    const doesNotConform = results.filter(r => r.status === Status.DOES_NOT_CONFORM).length;
    const partial = results.filter(r => r.status === Status.PARTIAL_CONFORMANCE).length;
    const notFound = results.filter(r => r.status === Status.NOT_FOUND).length;
    const complianceRate = total > 0 ? Math.round((conforms / total) * 100) : 0;

    return { total, conforms, doesNotConform, partial, notFound, complianceRate };
  }, [results]);

  const getRingColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  }

  const ringColor = getRingColor(stats.complianceRate);

  return (
    <div className="mb-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center text-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              className="text-slate-700"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={ringColor}
              strokeDasharray={`${stats.complianceRate}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              transform="rotate(90 18 18)"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className={`text-3xl font-bold ${ringColor}`}>{stats.complianceRate}%</span>
          </div>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-slate-200">Соответствия</h3>
      </div>

      <StatCard title="Всего требований" value={stats.total} />
      <StatCard title="Не соответствует" value={stats.doesNotConform} color="text-red-400" />
      <StatCard title="Не найдено" value={stats.notFound} color="text-slate-400" />
    </div>
  );
};

interface StatCardProps {
    title: string;
    value: number;
    color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color = 'text-sky-400' }) => (
    <div className="bg-slate-800 p-4 rounded-lg text-center flex flex-col justify-center">
        <span className={`text-4xl font-bold ${color}`}>{value}</span>
        <h4 className="text-sm text-slate-400 mt-1">{title}</h4>
    </div>
);

export default AnalyticsDashboard;