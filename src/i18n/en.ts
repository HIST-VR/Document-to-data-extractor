export const en = {
  header: {
    skip: "Skip to content",
    home: "DocLens UA home",
    language: "Language",
    theme: "Theme",
    themeToDark: "Dark theme",
    themeToLight: "Light theme",
  },
  hero: {
    title: "Turn a Ukrainian invoice, act, or waybill into checked structured data.",
  },
  drop: {
    title: "Drop a document",
    hint: "PDF, JPG, or PNG up to 4 MB and 5 pages. CSV and XLSX are converted in the browser and sent as text.",
    choose: "Choose a file",
    replace: "Choose a different file",
    clear: "Remove file",
    reading: "Reading the file",
    ready: "Ready to extract",
  },
  samples: {
    title: "Sample documents",
    hint: "Fictional companies. Choosing one does not call the model.",
    invoice: "Invoice",
    act: "Act",
    waybill: "Waybill",
    export: "1C export",
  },
  how: {
    title: "How it works",
    steps: [
      {
        id: "render",
        title: "Render",
        body: "The browser reads the file. A PDF longer than five pages stops here.",
      },
      {
        id: "upload",
        title: "Upload",
        body: "A live file is sent only after you accept the terms and pass the spam check.",
      },
      {
        id: "model",
        title: "Model",
        body: "One Gemini call classifies the document and copies only what is printed.",
      },
      {
        id: "validate",
        title: "Validate",
        body: "Arithmetic, identifiers, the date, and the amount in words are checked on this device.",
      },
    ],
  },
  rules: {
    title: "Validation checks",
    intro: "Every status comes from these rules. The model does not grade its own accuracy.",
  },
  consent: {
    title: "Before this file is uploaded",
    lead: "Sample documents stay on this page. A live upload leaves the device.",
    sentence:
      "This file is sent to Google's Gemini API on a free tier. Google may use submitted content to improve its products. Do not upload confidential documents.",
    continue: "Continue",
    cancel: "Cancel",
  },
  turnstile: {
    label: "Spam check",
    extract: "Extract",
    needConsent: "Review upload terms",
  },
  progress: {
    title: "Working through the document.",
    state: {
      pending: "Waiting",
      active: "In progress",
      done: "Done",
    },
    steps: {
      render: "Render",
      upload: "Upload",
      model: "Model",
      validate: "Validate",
    },
    detail: {
      render: "Reading the file in the browser.",
      upload: "Sending the prepared file.",
      model: "Waiting for the model.",
      validate: "Checking the fields on this device.",
    },
  },
  fileIssues: {
    size: "This file is larger than 4 MB.",
    type: "Use a PDF, JPG, PNG, CSV, or XLSX file.",
    empty: "This file is empty.",
    pages: "This PDF is longer than 5 pages.",
    read: "This file could not be read.",
  },
  pipeline: {
    network: "The extraction request did not finish. Check the connection and try again.",
    schema: "The model returned data that did not match the document schema.",
    textSize: "This spreadsheet is longer than 500,000 characters.",
    emptyText: "This spreadsheet has no text to send.",
    unavailable: "Live extraction is not configured. Sample documents still run on this device.",
    checking: "Checking configuration",
  },
  results: {
    fresh: "New document",
    sample: "Sample",
    upload: "Upload",
    escalated: "A second model ran because the first result had several validation errors.",
    unsupportedTitle: "This document is not a supported type.",
    unsupportedBody:
      "DocLens reads invoices, acts of completed work, and waybills. No fields were filled in from this file.",
    noLines: "No line items were printed.",
    line: "Line",
    summary: (passed: number, total: number): string =>
      `${passed}/${total} ${total === 1 ? "check" : "checks"} passed`,
    issues: "Needs attention",
    invalidDraft: "That value was not applied.",
    emptyOption: "Not printed",
    pageCount: (count: number): string => (count === 1 ? "1 page" : `${count} pages`),
    sheet: "Spreadsheet",
    image: "Image",
    pdf: "PDF",
    viewerLabel: "Document",
    loading: "Opening the document",
    unreadable: "This file could not be shown.",
    notInText: "This phrase is not in the text layer.",
    history: "History",
    noFile: "The file is not kept on this device. These are the stored fields.",
  },
  export: {
    title: "Export",
    json: "JSON",
    csv: "CSV",
    xlsx: "XLSX",
    copy: "Copy JSON",
    copied: "Copied",
    failed: "The clipboard is not available in this browser.",
  },
  history: {
    title: "On this device",
    hint: "The last 10 extractions. The file is not stored.",
    empty: "No extractions yet.",
    clear: "Clear all",
    unavailable: "This browser is not storing history.",
  },
  groups: {
    parties: "Parties",
    document: "Document",
    lines: "Line items",
    totals: "Totals",
    payment: "Payment",
  },
  roles: {
    invoice: { seller: "Seller", buyer: "Buyer" },
    act: { seller: "Executor", buyer: "Customer" },
    waybill: { seller: "Supplier", buyer: "Recipient" },
    unknown: { seller: "Seller", buyer: "Buyer" },
  },
  docType: {
    invoice: "Invoice",
    act: "Act of completed work",
    waybill: "Waybill",
    unknown: "Unsupported",
  },
  fields: {
    documentType: "Type",
    documentNumber: "Number",
    issueDate: "Issue date",
    currency: "Currency",
    name: "Name",
    edrpou: "ЄДРПОУ",
    ipn: "ІПН",
    iban: "IBAN",
    address: "Address",
    description: "Description",
    unit: "Unit",
    quantity: "Quantity",
    unitPrice: "Unit price",
    vatRate: "VAT rate",
    amount: "Amount",
    subtotal: "Subtotal",
    vatTotal: "VAT",
    total: "Total",
    totalInWords: "Amount in words",
    paymentPurpose: "Payment purpose",
    printed: "Printed",
    page: "Page",
  },
  status: {
    ok: "Passed",
    warning: "Check",
    error: "Error",
  },
  footer: {
    storage: "DocLens stores nothing on the server and does not keep your file.",
    browserFree: "This browser remembers the language, the theme, whether you accepted the upload terms, and the last 10 extractions. It does not keep the file.",
    browserPaid: "This browser remembers the language, the theme, and the last 10 extractions. It does not keep the file.",
    browserUnknown: "This browser remembers the language and the theme until configuration loads, and the last 10 extractions. It does not keep the file.",
    freeTerms:
      "A live upload is sent to Google's Gemini API. On the free tier, Google may use submitted content to improve its products. Do not upload confidential documents.",
    paidTerms: "A live upload is sent to Google's Gemini API under paid-tier terms.",
    samples: "Sample documents are part of this page and are not uploaded.",
  },
} as const;

type Widen<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Widen<Result>
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : T extends string
      ? string
      : T extends number
        ? number
        : T extends object
          ? { [Key in keyof T]: Widen<T[Key]> }
          : T;

export type Copy = Widen<typeof en>;
