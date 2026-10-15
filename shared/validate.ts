import { assessIssueDate } from "./dates";
import { checkEdrpou, checkIban, checkIpn, type IdCheck } from "./identifiers";
import { compareAmountInWords } from "./money-words";
import type {
  Extraction,
  FieldCheck,
  FieldStatus,
  LineItem,
  LocalizedReason,
  Party,
  ValidationReport,
  ValidationRule,
} from "./types";

const MONEY_TOLERANCE = 0.01;
const RATE_EPSILON = 1e-6;

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: "line-amount",
    en: "Each line amount equals quantity × unit price, within 0.01.",
    uk: "Сума кожного рядка дорівнює кількості × ціна, з допуском 0,01.",
  },
  {
    id: "subtotal",
    en: "The subtotal equals the sum of the line amounts.",
    uk: "Підсумок дорівнює сумі рядків.",
  },
  {
    id: "vat",
    en: "VAT equals the sum of line amount × rate. Allowed rates are 20%, 7%, and 0%.",
    uk: "ПДВ дорівнює сумі рядок × ставка. Дозволені ставки: 20%, 7% і 0%.",
  },
  {
    id: "total",
    en: "The total equals the subtotal plus VAT.",
    uk: "Разом дорівнює підсумку плюс ПДВ.",
  },
  {
    id: "edrpou",
    en: "ЄДРПОУ is 8 digits plus the published community check digit. The State Tax Service has not published an official algorithm.",
    uk: "ЄДРПОУ — 8 цифр і поширена контрольна цифра. Державна податкова служба не публікувала офіційний алгоритм.",
  },
  {
    id: "ipn",
    en: "ІПН (РНОКПП) is 10 digits plus the published community check digit. The official algorithm is not published.",
    uk: "ІПН (РНОКПП) — 10 цифр і поширена контрольна цифра. Офіційний алгоритм не опубліковано.",
  },
  {
    id: "iban",
    en: "A UA IBAN has 29 characters and passes the ISO 13616 mod-97 check.",
    uk: "UA IBAN має 29 символів і проходить перевірку ISO 13616 mod-97.",
  },
  {
    id: "date",
    en: "The issue date is a real date from 1 January 1991 through 7 days ahead.",
    uk: "Дата документа — справжня дата від 1 січня 1991 року до 7 днів наперед.",
  },
  {
    id: "words",
    en: "The amount in words is compared only when it matches a supported Ukrainian, Russian, or English phrase.",
    uk: "Суму прописом порівняно лише якщо зворот входить до підтримуваних українських, російських або англійських фраз.",
  },
];

function check(
  path: string,
  status: FieldStatus,
  code: FieldCheck["code"],
  en: string,
  uk: string,
): FieldCheck {
  return { path, status, code, reason: { en, uk } };
}

function almost(left: number, right: number): boolean {
  return Math.abs(left - right) <= MONEY_TOLERANCE + 1e-9;
}

function isAllowedRate(rate: number): boolean {
  return (
    Math.abs(rate - 0) < RATE_EPSILON ||
    Math.abs(rate - 0.07) < RATE_EPSILON ||
    Math.abs(rate - 0.2) < RATE_EPSILON
  );
}

function presentText(path: string, value: string | null, missing: LocalizedReason): FieldCheck {
  if (value == null) {
    return check(path, "warning", "missing", missing.en, missing.uk);
  }
  return check(path, "ok", "present", "Printed on the document.", "Є на документі.");
}

function optionalText(path: string, value: string | null): FieldCheck {
  if (value == null) {
    return check(path, "ok", "absent", "Not printed on the document.", "На документі немає.");
  }
  return check(path, "ok", "present", "Printed on the document.", "Є на документі.");
}

function numberPresence(path: string, value: number | null, labelEn: string, labelUk: string): FieldCheck {
  if (value == null) {
    return check(path, "warning", "missing", `${labelEn} is missing.`, `${labelUk} немає.`);
  }
  return check(path, "ok", "present", "Printed on the document.", "Є на документі.");
}

function identifierCheck(
  path: string,
  value: string | null,
  run: (input: string) => IdCheck,
  formatEn: string,
  formatUk: string,
  checksumEn: string,
  checksumUk: string,
  okEn: string,
  okUk: string,
): FieldCheck {
  if (value == null) {
    return check(path, "ok", "id-absent", "Not printed on the document.", "На документі немає.");
  }
  const result = run(value);
  if (result.ok) {
    return check(path, "ok", "id-ok", okEn, okUk);
  }
  if (result.reason === "format") {
    return check(path, "error", "id-format", formatEn, formatUk);
  }
  return check(path, "error", "id-checksum", checksumEn, checksumUk);
}

function partyChecks(prefix: "seller" | "buyer", party: Party): FieldCheck[] {
  const who = prefix === "seller" ? "Seller" : "Buyer";
  const whoUk = prefix === "seller" ? "Продавця" : "Покупця";
  return [
    presentText(`${prefix}.name`, party.name.value, {
      en: `${who} name is missing.`,
      uk: `Назву ${whoUk.toLowerCase()} не вказано.`,
    }),
    identifierCheck(
      `${prefix}.edrpou`,
      party.edrpou.value,
      checkEdrpou,
      "ЄДРПОУ must be 8 digits.",
      "ЄДРПОУ має містити 8 цифр.",
      "The ЄДРПОУ check digit does not match.",
      "Контрольна цифра ЄДРПОУ не збігається.",
      "The ЄДРПОУ check digit matches.",
      "Контрольна цифра ЄДРПОУ збігається.",
    ),
    identifierCheck(
      `${prefix}.ipn`,
      party.ipn.value,
      checkIpn,
      "ІПН must be 10 digits.",
      "ІПН має містити 10 цифр.",
      "The ІПН check digit does not match.",
      "Контрольна цифра ІПН не збігається.",
      "The ІПН check digit matches.",
      "Контрольна цифра ІПН збігається.",
    ),
    identifierCheck(
      `${prefix}.iban`,
      party.iban.value,
      checkIban,
      "A UA IBAN must be UA followed by 27 digits.",
      "UA IBAN має складатися з UA і 27 цифр.",
      "The IBAN mod-97 check failed.",
      "Перевірка IBAN mod-97 не пройдена.",
      "The IBAN passes the mod-97 check.",
      "IBAN проходить перевірку mod-97.",
    ),
    optionalText(`${prefix}.address`, party.address.value),
  ];
}

function lineChecks(index: number, line: LineItem): FieldCheck[] {
  const base = `lineItems[${index}]`;
  const quantity = line.quantity.value;
  const unitPrice = line.unitPrice.value;
  const amount = line.amount.value;
  let amountCheck: FieldCheck;
  if (quantity == null || unitPrice == null || amount == null) {
    amountCheck = check(
      `${base}.amount`,
      "warning",
      "arithmetic-incomplete",
      "Quantity, unit price, or line amount is missing, so this line was not checked.",
      "Немає кількості, ціни або суми, тож рядок не перевірено.",
    );
  } else if (almost(quantity * unitPrice, amount)) {
    amountCheck = check(
      `${base}.amount`,
      "ok",
      "arithmetic-ok",
      "Line amount matches quantity × unit price.",
      "Сума рядка збігається з кількістю × ціна.",
    );
  } else {
    amountCheck = check(
      `${base}.amount`,
      "error",
      "arithmetic-off",
      "Line amount differs from quantity × unit price by more than 0.01.",
      "Сума рядка відрізняється від кількості × ціна більше ніж на 0,01.",
    );
  }

  const rate = line.vatRate.value;
  let rateCheck: FieldCheck;
  if (rate == null) {
    rateCheck = check(
      `${base}.vatRate`,
      "warning",
      "vat-missing",
      "VAT rate is missing.",
      "Ставку ПДВ не вказано.",
    );
  } else if (isAllowedRate(rate)) {
    rateCheck = check(
      `${base}.vatRate`,
      "ok",
      "vat-ok",
      "VAT rate is 20%, 7%, or 0%.",
      "Ставка ПДВ — 20%, 7% або 0%.",
    );
  } else {
    rateCheck = check(
      `${base}.vatRate`,
      "error",
      "vat-bad",
      "VAT rate must be 20%, 7%, or 0%.",
      "Ставка ПДВ має бути 20%, 7% або 0%.",
    );
  }

  return [
    presentText(`${base}.description`, line.description.value, {
      en: "Line description is missing.",
      uk: "Опис рядка не вказано.",
    }),
    optionalText(`${base}.unit`, line.unit.value),
    numberPresence(`${base}.quantity`, quantity, "Quantity", "Кількості"),
    numberPresence(`${base}.unitPrice`, unitPrice, "Unit price", "Ціни"),
    rateCheck,
    amountCheck,
  ];
}

function sumCheck(
  path: string,
  actual: number | null,
  expected: number | null,
  complete: boolean,
  okEn: string,
  okUk: string,
  offEn: string,
  offUk: string,
  incompleteEn: string,
  incompleteUk: string,
): FieldCheck {
  if (!complete || actual == null || expected == null) {
    return check(path, "warning", "sum-incomplete", incompleteEn, incompleteUk);
  }
  if (almost(actual, expected)) {
    return check(path, "ok", "sum-ok", okEn, okUk);
  }
  return check(path, "error", "sum-off", offEn, offUk);
}

function wordsCheck(phrase: string | null, total: number | null): FieldCheck {
  if (phrase == null) {
    return check(
      "totalInWords",
      "warning",
      "words-missing",
      "The amount in words is missing.",
      "Суму прописом не вказано.",
    );
  }
  if (total == null) {
    return check(
      "totalInWords",
      "ok",
      "words-unchecked",
      "The total is missing, so the amount in words was not compared.",
      "Підсумку немає, тож суму прописом не порівняно.",
    );
  }
  const verdict = compareAmountInWords(phrase, total);
  if (verdict === "unchecked") {
    return check(
      "totalInWords",
      "ok",
      "words-unchecked",
      "The amount in words is outside the phrases this check can read, so it was not compared.",
      "Цей зворот суми прописом не розпізнано, тож його не порівняно.",
    );
  }
  if (verdict === "match") {
    return check(
      "totalInWords",
      "ok",
      "words-ok",
      "The amount in words matches the total.",
      "Сума прописом збігається з підсумком.",
    );
  }
  return check(
    "totalInWords",
    "error",
    "words-off",
    "The amount in words does not match the total.",
    "Сума прописом не збігається з підсумком.",
  );
}

function dateCheck(value: string | null, now: Date): FieldCheck {
  const verdict = assessIssueDate(value, now);
  if (verdict === "missing") {
    return check("issueDate", "warning", "date-missing", "Issue date is missing.", "Дату документа не вказано.");
  }
  if (verdict === "invalid") {
    return check("issueDate", "error", "date-invalid", "Issue date could not be read.", "Дату документа не вдалося прочитати.");
  }
  if (verdict === "implausible") {
    return check(
      "issueDate",
      "error",
      "date-implausible",
      "Issue date is outside 1 January 1991 through 7 days ahead.",
      "Дата поза межами від 1 січня 1991 року до 7 днів наперед.",
    );
  }
  return check("issueDate", "ok", "date-ok", "Issue date is plausible.", "Дата документа виглядає достовірно.");
}

function currencyCheck(value: Extraction["currency"]["value"]): FieldCheck {
  if (value == null) {
    return check("currency", "warning", "currency-missing", "Currency is missing.", "Валюту не вказано.");
  }
  return check("currency", "ok", "currency-ok", "Currency is UAH, USD, or EUR.", "Валюта — UAH, USD або EUR.");
}

function lineAmount(line: LineItem): number | null {
  return line.amount.value;
}

function vatContribution(line: LineItem): number | null {
  const amount = line.amount.value;
  const rate = line.vatRate.value;
  if (amount == null || rate == null || !isAllowedRate(rate)) {
    return null;
  }
  return amount * rate;
}

export function validateExtraction(extraction: Extraction, now: Date = new Date()): ValidationReport {
  if (extraction.documentType === "unknown") {
    return { unsupported: true, checks: [], passed: 0, total: 0, errorCount: 0 };
  }

  const checks: FieldCheck[] = [
    presentText("documentNumber", extraction.documentNumber.value, {
      en: "Document number is missing.",
      uk: "Номер документа не вказано.",
    }),
    dateCheck(extraction.issueDate.value, now),
    currencyCheck(extraction.currency.value),
    ...partyChecks("seller", extraction.seller),
    ...partyChecks("buyer", extraction.buyer),
  ];

  for (const [index, line] of extraction.lineItems.entries()) {
    checks.push(...lineChecks(index, line));
  }

  const amounts = extraction.lineItems.map(lineAmount);
  const amountComplete = extraction.lineItems.length > 0 && amounts.every((amount) => amount != null);
  const amountSum = amountComplete ? amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) : null;

  checks.push(
    sumCheck(
      "subtotal",
      extraction.subtotal.value,
      extraction.lineItems.length === 0 ? 0 : amountSum,
      extraction.lineItems.length === 0 || amountComplete,
      "Subtotal matches the sum of the lines.",
      "Підсумок збігається із сумою рядків.",
      "Subtotal does not match the sum of the lines.",
      "Підсумок не збігається із сумою рядків.",
      "Subtotal was not fully checked because a line amount or the subtotal is missing.",
      "Підсумок перевірено не повністю: бракує суми рядка або підсумку.",
    ),
  );

  const contributions = extraction.lineItems.map(vatContribution);
  const vatComplete = extraction.lineItems.length > 0 && contributions.every((part) => part != null);
  const vatSum = vatComplete ? contributions.reduce<number>((sum, part) => sum + (part ?? 0), 0) : null;
  checks.push(
    sumCheck(
      "vatTotal",
      extraction.vatTotal.value,
      extraction.lineItems.length === 0 ? 0 : vatSum,
      extraction.lineItems.length === 0 || vatComplete,
      "VAT total matches the rates applied to the lines.",
      "Сума ПДВ збігається з нарахуванням по рядках.",
      "VAT total does not match the rates applied to the lines.",
      "Сума ПДВ не збігається з нарахуванням по рядках.",
      "VAT total was not fully checked because a line rate, a line amount, or the VAT total is missing.",
      "Суму ПДВ перевірено не повністю: бракує ставки, суми рядка або суми ПДВ.",
    ),
  );

  const subtotal = extraction.subtotal.value;
  const vatTotal = extraction.vatTotal.value;
  const total = extraction.total.value;
  const totalComplete = subtotal != null && vatTotal != null;
  checks.push(
    sumCheck(
      "total",
      total,
      totalComplete ? subtotal + vatTotal : null,
      totalComplete,
      "Total equals subtotal plus VAT.",
      "Разом дорівнює підсумку плюс ПДВ.",
      "Total does not equal subtotal plus VAT.",
      "Разом не дорівнює підсумку плюс ПДВ.",
      "Total was not fully checked because the subtotal, VAT, or total is missing.",
      "Разом перевірено не повністю: бракує підсумку, ПДВ або суми разом.",
    ),
  );

  checks.push(wordsCheck(extraction.totalInWords.value, total));
  checks.push(optionalText("paymentPurpose", extraction.paymentPurpose.value));

  const passed = checks.filter((item) => item.status === "ok").length;
  const errorCount = checks.filter((item) => item.status === "error").length;
  return {
    unsupported: false,
    checks,
    passed,
    total: checks.length,
    errorCount,
  };
}

export function checksByPath(report: ValidationReport): Map<string, FieldCheck> {
  return new Map(report.checks.map((item) => [item.path, item]));
}
