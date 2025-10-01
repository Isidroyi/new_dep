export enum Status {
  CONFORMS = 'Соответствует',
  DOES_NOT_CONFORM = 'Не соответствует',
  PARTIAL_CONFORMANCE = 'Частичное соответствие',
  NOT_FOUND = 'Не найдено',
}

export interface RequirementDetail {
  id: number;
  parameter: string;
  requirement: string;
  source: string;
  notes: string;
}

export interface OfferComparison {
  documentName: string;
  actualValue: string;
  status: Status;
  pageNumber: number;
  notes?: string;
}

export interface ComplianceResult extends RequirementDetail {
  actualValue: string;
  status: Status;
  explanation: string;
  pageNumber: number;
  bestDocument?: string;
  comparisons?: OfferComparison[];
}