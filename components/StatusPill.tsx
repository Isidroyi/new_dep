import React from 'react';
import { Status } from '../types';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, QuestionMarkCircleIcon } from './icons';

interface StatusPillProps {
  status: Status;
}

const statusConfig = {
  [Status.CONFORMS]: {
    text: 'Соответствует',
    classes: 'bg-green-500/10 text-green-400',
    Icon: CheckCircleIcon,
  },
  [Status.DOES_NOT_CONFORM]: {
    text: 'Не соответствует',
    classes: 'bg-red-500/10 text-red-400',
    Icon: XCircleIcon,
  },
  [Status.PARTIAL_CONFORMANCE]: {
    text: 'Частично',
    classes: 'bg-yellow-500/10 text-yellow-400',
    Icon: ExclamationCircleIcon,
  },
  [Status.NOT_FOUND]: {
    text: 'Не найдено',
    classes: 'bg-slate-600/20 text-slate-400',
    Icon: QuestionMarkCircleIcon,
  },
};

const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig[Status.NOT_FOUND];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.classes}`}>
      <config.Icon className="w-4 h-4 mr-1.5" />
      {config.text}
    </span>
  );
};

export default StatusPill;
