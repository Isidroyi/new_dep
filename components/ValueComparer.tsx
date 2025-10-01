import React, { useMemo } from 'react';
import { Status, OfferComparison } from '../types';

interface ValueComparerProps {
  requirement: string;
  actualValue: string;
  status: Status;
  bestDocument?: string;
  comparisons?: OfferComparison[];
}

const numberFormatter = new Intl.NumberFormat('ru-RU');

const extractCurrencyValue = (text: string): number | null => {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const currencyMatch = normalized.match(/(-?\d[\d\s.,]*)/);
  if (!currencyMatch) return null;
  const numeric = currencyMatch[1]
    .replace(/\s+/g, '')
    .replace(/,(?=\d{1,2}(?:\D|$))/g, '.')
    .replace(/[^\d.-]/g, '');
  const value = Number.parseFloat(numeric);
  return Number.isFinite(value) ? value : null;
};

const ValueComparer: React.FC<ValueComparerProps> = ({ actualValue, status, bestDocument, comparisons }) => {
  const className = useMemo(() => {
    if (status === Status.CONFORMS) return 'text-green-400 font-semibold';
    if (status === Status.DOES_NOT_CONFORM) return 'text-red-400 font-semibold';
    if (status === Status.PARTIAL_CONFORMANCE) return 'text-yellow-400 font-semibold';
    return 'text-slate-300';
  }, [status]);

  const bestOfferValue = useMemo(() => {
    if (comparisons && comparisons.length > 0) {
      const explicitBest = bestDocument
        ? comparisons.find((offer) => offer.documentName === bestDocument)
        : null;
      if (explicitBest) {
        const bestValue = extractCurrencyValue(explicitBest.actualValue);
        if (bestValue !== null) return bestValue;
      }
    }
    return extractCurrencyValue(actualValue);
  }, [comparisons, bestDocument, actualValue]);

  const actualValueHasPrice = useMemo(
    () => bestOfferValue !== null || extractCurrencyValue(actualValue) !== null,
    [bestOfferValue, actualValue]
  );

  const secondaryOffers = useMemo(() => {
    if (!comparisons || comparisons.length === 0) {
      return [];
    }

    const baseValue = bestOfferValue;

    return comparisons
      .filter((offer) => !bestDocument || offer.documentName !== bestDocument)
      .map((offer) => {
        const offerValue = extractCurrencyValue(offer.actualValue);
        let deltaLabel: string | null = null;

        if (offerValue !== null && baseValue !== null) {
          const delta = offerValue - baseValue;
          if (Math.abs(delta) >= 1) {
            deltaLabel = `${delta > 0 ? '+' : '−'}${numberFormatter.format(Math.abs(delta))} ₽`;
          }
        }

        return {
          ...offer,
          deltaLabel,
          isCheaper: baseValue !== null && offerValue !== null ? offerValue < baseValue : null,
        };
      });
  }, [comparisons, bestDocument, bestOfferValue]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-1">
        {bestDocument && (
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Лучшее предложение: <span className="text-slate-200 capitalize">{bestDocument}</span>
          </span>
        )}
        <span
          className={`${className} ${
            actualValueHasPrice
              ? 'bg-sky-500/10 text-sky-200 border border-sky-400/40 px-2 py-1 rounded-md shadow-sm'
              : ''
          }`}
        >
          {actualValue || '—'}
        </span>
      </div>
      {secondaryOffers.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {secondaryOffers.map((offer) => {
            const offerHasPrice = extractCurrencyValue(offer.actualValue) !== null;
            return (
              <div
                key={`${offer.documentName}-${offer.pageNumber}`}
                className="text-xs text-slate-400 bg-slate-700/40 border border-slate-600/60 rounded-md px-2 py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-300">{offer.documentName}</span>
                  {offer.deltaLabel && (
                    <span className={`font-semibold ${offer.isCheaper ? 'text-emerald-300' : 'text-red-300'}`}>
                      Δ {offer.deltaLabel} к лучшему
                    </span>
                  )}
                </div>
                <div
                  className={`mt-0.5 ${
                    offerHasPrice
                      ? 'text-sky-200 bg-slate-900/50 border border-sky-500/30 px-2 py-1 rounded-md'
                      : 'text-slate-400'
                  }`}
                >
                  {offer.actualValue || '—'}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">
                  {offer.status}
                  {offer.notes ? ` · ${offer.notes}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ValueComparer;