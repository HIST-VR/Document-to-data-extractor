export type DocumentType = "invoice" | "act" | "waybill" | "unknown";

export type Currency = "UAH" | "USD" | "EUR";

export type FieldStatus = "ok" | "warning" | "error";

export interface Sourced<T> {
  value: T | null;
  evidence: string | null;
  page: number | null;
}

export interface Party {
  name: Sourced<string>;
  edrpou: Sourced<string>;
  ipn: Sourced<string>;
  iban: Sourced<string>;
  address: Sourced<string>;
}

export interface LineItem {
  description: Sourced<string>;
  unit: Sourced<string>;
  quantity: Sourced<number>;
  unitPrice: Sourced<number>;
  vatRate: Sourced<number>;
  amount: Sourced<number>;
}

/** Shape returned by the model. Escalation is added by the server afterwards. */
export interface Extraction {
  documentType: DocumentType;
  documentNumber: Sourced<string>;
  issueDate: Sourced<string>;
  currency: Sourced<Currency>;
  seller: Party;
  buyer: Party;
  lineItems: LineItem[];
  subtotal: Sourced<number>;
  vatTotal: Sourced<number>;
  total: Sourced<number>;
  totalInWords: Sourced<string>;
  paymentPurpose: Sourced<string>;
}

export interface ResultExtraction extends Extraction {
  escalated?: boolean;
}

export type CheckCode =
  | "present"
  | "absent"
  | "missing"
  | "arithmetic-ok"
  | "arithmetic-off"
  | "arithmetic-incomplete"
  | "vat-ok"
  | "vat-bad"
  | "vat-missing"
  | "sum-ok"
  | "sum-off"
  | "sum-incomplete"
  | "id-ok"
  | "id-format"
  | "id-checksum"
  | "id-absent"
  | "date-ok"
  | "date-invalid"
  | "date-implausible"
  | "date-missing"
  | "words-ok"
  | "words-off"
  | "words-unchecked"
  | "words-missing"
  | "currency-ok"
  | "currency-missing";

export interface LocalizedReason {
  en: string;
  uk: string;
}

export interface FieldCheck {
  path: string;
  status: FieldStatus;
  code: CheckCode;
  reason: LocalizedReason;
}

export interface ValidationReport {
  unsupported: boolean;
  checks: FieldCheck[];
  passed: number;
  total: number;
  errorCount: number;
}

export interface ValidationRule {
  id: string;
  en: string;
  uk: string;
}
