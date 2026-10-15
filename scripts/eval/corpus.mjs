import { evidenceEntries } from "./score.mjs";

export const EVAL_NOW = "2026-10-16T12:00:00Z";

const maple = {
  name: "ТОВ «Кленова Тінь»",
  edrpou: "21543006",
  ipn: "2456789015",
  iban: "UA533052990000000260011111111",
  address: "вул. Кленова, 4, м. Львів, 79008",
};
const shore = {
  name: "ТОВ «Сірий Берег»",
  edrpou: "55012033",
  ipn: "3019283743",
  iban: "UA873220010000000260022222222",
  address: "вул. Портова, 18, м. Одеса, 65026",
};
const fop = {
  name: "ФОП Марина Коваль",
  edrpou: null,
  ipn: "1982736454",
  iban: "UA673510050000000260033333333",
  address: "вул. Шевченка, 9, м. Чернівці, 58002",
};
const pier = {
  name: "North Pier Trading",
  edrpou: null,
  ipn: null,
  iban: null,
  address: "14 Quay Street, Dover",
};
const field = {
  name: "ТОВ «Польова Межа»",
  edrpou: "19088019",
  ipn: "2765432103",
  iban: "UA963000120000000260044444444",
  address: "вул. Польова, 7, м. Вінниця, 21001",
};
const quiet = {
  name: "ООО «Тихий Берег»",
  edrpou: "62345028",
  ipn: "3344556671",
  iban: "UA593365030000000260055555555",
  address: "ул. Набережная, 3, г. Харьков, 61000",
};

const LABELS = {
  uk: {
    supplier: "Постачальник",
    buyer: "Покупець",
    performer: "Виконавець",
    customer: "Замовник",
    receiver: "Отримувач",
    edrpou: "ЄДРПОУ",
    ipn: "ІПН",
    iban: "IBAN",
    address: "Адреса:",
    date: "Дата:",
    currency: "Валюта:",
    number: (value) => `№ ${value}`,
    subtotal: (value) => `Разом без ПДВ: ${value}`,
    vat: (value) => `ПДВ: ${value}`,
    total: (value) => `Всього: ${value}`,
    words: (value) => `Сума прописом: ${value}`,
    purpose: (value) => `Призначення платежу: ${value}`,
    unit: (value) => `Од. ${value}`,
    quantity: (value) => `Кількість ${value}`,
    price: (value) => `Ціна ${value}`,
    rate: (value) => `ПДВ ${value}`,
    amount: (value) => `Сума ${value}`,
  },
  en: {
    supplier: "Seller",
    buyer: "Buyer",
    performer: "Supplier",
    customer: "Customer",
    receiver: "Receiver",
    edrpou: "EDRPOU",
    ipn: "TRN",
    iban: "IBAN",
    address: "Address:",
    date: "Date:",
    currency: "Currency:",
    number: (value) => `No. ${value}`,
    subtotal: (value) => `Subtotal: ${value}`,
    vat: (value) => `VAT: ${value}`,
    total: (value) => `Total: ${value}`,
    words: (value) => `Amount in words: ${value}`,
    purpose: (value) => `Payment reference: ${value}`,
    unit: (value) => `Unit ${value}`,
    quantity: (value) => `Qty ${value}`,
    price: (value) => `Price ${value}`,
    rate: (value) => `VAT ${value}`,
    amount: (value) => `Amount ${value}`,
  },
  ru: {
    supplier: "Поставщик",
    buyer: "Покупатель",
    performer: "Исполнитель",
    customer: "Заказчик",
    receiver: "Получатель",
    edrpou: "ЕГРПОУ",
    ipn: "ИНН",
    iban: "IBAN",
    address: "Адрес:",
    date: "Дата:",
    currency: "Валюта:",
    number: (value) => `№ ${value}`,
    subtotal: (value) => `Итого без НДС: ${value}`,
    vat: (value) => `НДС: ${value}`,
    total: (value) => `Всего: ${value}`,
    words: (value) => `Сумма прописью: ${value}`,
    purpose: (value) => `Назначение платежа: ${value}`,
    unit: (value) => `Ед. ${value}`,
    quantity: (value) => `Кол-во ${value}`,
    price: (value) => `Цена ${value}`,
    rate: (value) => `НДС ${value}`,
    amount: (value) => `Сумма ${value}`,
  },
};

function money(value) {
  const [whole, fraction] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${fraction}`;
}

function empty() {
  return { value: null, evidence: null, page: null };
}

function sourced(value, evidence, page) {
  return { value, evidence, page };
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paras(lines) {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function partyLines(party, labels) {
  const lines = [party.name];
  if (party.edrpou) lines.push(`${labels.edrpou} ${party.edrpou}`);
  if (party.ipn) lines.push(`${labels.ipn} ${party.ipn}`);
  if (party.iban) lines.push(`${labels.iban} ${party.iban}`);
  lines.push(`${labels.address} ${party.address}`);
  return lines;
}

function partyFields(party, page) {
  return {
    name: sourced(party.name, party.name, page),
    edrpou: party.edrpou ? sourced(party.edrpou, party.edrpou, page) : empty(),
    ipn: party.ipn ? sourced(party.ipn, party.ipn, page) : empty(),
    iban: party.iban ? sourced(party.iban, party.iban, page) : empty(),
    address: sourced(party.address, party.address, page),
  };
}

function lineTable(items) {
  const rows = items
    .map((item) => {
      const cells = ["description", "unit", "quantity", "unitPrice", "vatRate", "amount"]
        .map((key) => `<td>${escapeHtml(item[key])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table>${rows}</table>`;
}

function lineStack(items) {
  return items.map((item) => paras([item.description, item.unit, item.quantity, item.unitPrice, item.vatRate, item.amount])).join("");
}

const LAYOUT_CSS = {
  table: "table, td { border: 1px solid #14120f; } td { padding: 4px 6px; }",
  ruled: "main { border-left: 6px solid #2b44ff; padding-left: 14px; } table, td { border-bottom: 1px solid #14120f; }",
  stack: "main { max-width: 92mm; } p { margin: 0; padding: 3px 0; border-bottom: 1px solid #e4dfd3; }",
  letter: "header { display: flex; justify-content: space-between; gap: 24px; } h1 { letter-spacing: 0.12em; } table, td { border-bottom: 1px solid #14120f; }",
  grid: "table, td { border: 2px solid #14120f; } td { padding: 5px 7px; } h1 { text-align: center; }",
  act: "h1 { text-align: center; } table { width: 100%; } td { border-bottom: 1px solid #14120f; padding: 4px; }",
  split: ".next { break-before: page; } h1 { text-align: center; } table, td { border: 1px solid #14120f; }",
  scan: "html, body { width: 840px; height: 1180px; background: #b9b3a8; } body { background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 5px); } main { min-height: 1080px; margin: 36px 28px; padding: 28px 22px; background: #e6e1d6; filter: grayscale(1) contrast(1.35); transform: rotate(-0.8deg); box-shadow: 0 8px 24px rgba(0,0,0,0.18); } table, td { border: 1px solid #444; }",
};

function shell(lang, body, css) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style>
@font-face { font-family: Onest; src: url("../../scripts/samples/fonts/Onest-Variable.ttf") format("truetype"); }
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; color: #14120f; font-family: Onest, sans-serif; font-size: 12px; line-height: 1.35; }
h1 { font-size: 20px; margin: 0 0 8px; }
h2 { font-size: 13px; margin: 10px 0 2px; }
p { margin: 0 0 2px; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
${css}
</style>
</head>
<body>${body}</body>
</html>
`;
}

function documentHtml(doc, view) {
  const head = `<h1>${escapeHtml(doc.title)}</h1>${paras(view.headerLines)}`;
  const parties = `<section><h2>${escapeHtml(view.sellerTitle)}</h2>${paras(view.sellerLines)}</section><section><h2>${escapeHtml(view.buyerTitle)}</h2>${paras(view.buyerLines)}</section>`;
  const lines = doc.layout === "stack" ? lineStack(view.items) : lineTable(view.items);
  const totals = paras(view.totalLines);
  const note = doc.note ? `<p>${escapeHtml(doc.note)}</p>` : "";
  let body;
  if (doc.layout === "split") {
    body = `<section>${head}${parties}</section><section class="next">${lines}${totals}${note}</section>`;
  } else if (doc.layout === "letter") {
    body = `<header class="letter"><div>${paras(view.sellerLines)}</div><div>${head}</div></header><section><h2>${escapeHtml(view.buyerTitle)}</h2>${paras(view.buyerLines)}</section>${lines}${totals}${note}`;
  } else {
    body = `<main class="${doc.layout}">${head}${parties}${lines}${totals}${note}</main>`;
  }
  return shell(doc.lang, body, LAYOUT_CSS[doc.layout]);
}

function present(doc) {
  const labels = LABELS[doc.lang];
  const headerPage = doc.headerPage;
  const linePage = doc.linePage;
  const numberLine = labels.number(doc.number);
  const items = doc.items.map((item) => ({
    description: item.description,
    unit: labels.unit(item.unit),
    quantity: labels.quantity(String(item.quantity)),
    unitPrice: labels.price(item.pricePrint),
    vatRate: labels.rate(item.vatPrint),
    amount: labels.amount(item.amountPrint),
    raw: item,
  }));
  const totalLines = [
    labels.subtotal(doc.subtotalPrint),
    labels.vat(doc.vatPrint),
    labels.total(doc.totalPrint),
    labels.words(doc.words),
  ];
  if (doc.purpose) totalLines.push(labels.purpose(doc.purpose));
  const extraction = {
    documentType: doc.documentType,
    documentNumber: sourced(doc.number, numberLine, headerPage),
    issueDate: sourced(doc.dateIso, doc.datePrint, headerPage),
    currency: sourced(doc.currency, doc.currency, headerPage),
    seller: partyFields(doc.seller, headerPage),
    buyer: partyFields(doc.buyer, headerPage),
    lineItems: items.map((item) => ({
      description: sourced(item.raw.description, item.description, linePage),
      unit: sourced(item.raw.unit, item.unit, linePage),
      quantity: sourced(item.raw.quantity, item.quantity, linePage),
      unitPrice: sourced(item.raw.unitPrice, item.unitPrice, linePage),
      vatRate: sourced(item.raw.vatRate, item.vatRate, linePage),
      amount: sourced(item.raw.amount, item.amount, linePage),
    })),
    subtotal: sourced(doc.subtotal, labels.subtotal(doc.subtotalPrint), linePage),
    vatTotal: sourced(doc.vatTotal, labels.vat(doc.vatPrint), linePage),
    total: sourced(doc.total, labels.total(doc.totalPrint), linePage),
    totalInWords: sourced(doc.words, doc.words, linePage),
    paymentPurpose: doc.purpose ? sourced(doc.purpose, doc.purpose, linePage) : empty(),
  };
  const view = {
    headerLines: [numberLine, `${labels.date} ${doc.datePrint}`, `${labels.currency} ${doc.currency}`],
    sellerTitle: labels[doc.sellerRole],
    buyerTitle: labels[doc.buyerRole],
    sellerLines: partyLines(doc.seller, labels),
    buyerLines: partyLines(doc.buyer, labels),
    items,
    totalLines,
  };
  const html = documentHtml(doc, view);
  for (const [evidence] of evidenceEntries(extraction)) {
    if (!html.includes(evidence)) {
      throw new Error(`${doc.id} HTML is missing ${evidence}`);
    }
  }
  return {
    id: doc.id,
    file: doc.file,
    mimeType: doc.mimeType,
    pages: doc.pages,
    planted: doc.planted,
    html,
    extraction,
  };
}

function line(description, unit, quantity, unitPrice, vatRate, vatPrint, amount = quantity * unitPrice) {
  return {
    description,
    unit,
    quantity,
    unitPrice,
    vatRate,
    vatPrint,
    amount,
    pricePrint: money(unitPrice),
    amountPrint: money(amount),
  };
}

function englishLine(description, unit, quantity, unitPrice, vatRate, vatPrint) {
  const amount = quantity * unitPrice;
  return {
    description,
    unit,
    quantity,
    unitPrice,
    vatRate,
    vatPrint,
    amount,
    pricePrint: unitPrice.toFixed(2),
    amountPrint: amount.toFixed(2),
  };
}

function base(spec) {
  return {
    planted: [],
    headerPage: 1,
    linePage: 1,
    pages: 1,
    mimeType: "application/pdf",
    sellerRole: "supplier",
    buyerRole: "buyer",
    currency: "UAH",
    note: null,
    purpose: null,
    ...spec,
    file: spec.file,
  };
}

const DOCUMENTS = [
  base({
    id: "invoice-classic",
    file: "invoice-classic.pdf",
    documentType: "invoice",
    layout: "table",
    lang: "uk",
    title: "РАХУНОК-ФАКТУРА",
    number: "КЛ-2201",
    dateIso: "2026-03-16",
    datePrint: "16.03.2026",
    seller: maple,
    buyer: shore,
    items: [
      line("Консультація з обліку", "год", 2, 100, 0.2, "20%"),
      line("Архівна коробка", "шт", 1, 50, 0.2, "20%"),
    ],
    subtotal: 250,
    subtotalPrint: money(250),
    vatTotal: 50,
    vatPrint: money(50),
    total: 300,
    totalPrint: money(300),
    words: "Триста гривень 00 копійок",
    purpose: "Оплата за консультацію",
  }),
  base({
    id: "invoice-narrow",
    file: "invoice-narrow.pdf",
    documentType: "invoice",
    layout: "stack",
    lang: "uk",
    title: "РАХУНОК",
    number: "КЛ-2202",
    dateIso: "2026-02-02",
    datePrint: "02.02.2026",
    seller: field,
    buyer: maple,
    items: [line("Нічний аудит", "послуга", 4, 150, 0.2, "20%")],
    subtotal: 600,
    subtotalPrint: money(600),
    vatTotal: 120,
    vatPrint: money(120),
    total: 720,
    totalPrint: money(720),
    words: "Сімсот двадцять гривень 00 копійок",
    purpose: "Оплата аудиту",
  }),
  base({
    id: "invoice-english",
    file: "invoice-english.pdf",
    documentType: "invoice",
    layout: "letter",
    lang: "en",
    title: "INVOICE",
    number: "NP-15",
    dateIso: "2026-01-11",
    datePrint: "11.01.2026",
    currency: "USD",
    seller: pier,
    buyer: shore,
    sellerRole: "supplier",
    buyerRole: "buyer",
    items: [englishLine("Catalogue delivery", "pcs", 1, 120, 0, "0%")],
    subtotal: 120,
    subtotalPrint: "120.00",
    vatTotal: 0,
    vatPrint: "0.00",
    total: 120,
    totalPrint: "120.00",
    words: "One hundred twenty dollars 00 kopecks",
    purpose: "Catalogue order 15",
  }),
  base({
    id: "invoice-vat7",
    file: "invoice-vat7.pdf",
    documentType: "invoice",
    layout: "ruled",
    lang: "uk",
    title: "РАХУНОК-ФАКТУРА",
    number: "КЛ-2207",
    dateIso: "2026-01-20",
    datePrint: "20.01.2026",
    seller: maple,
    buyer: field,
    items: [line("Медичний огляд", "послуга", 2, 100, 0.07, "7%")],
    subtotal: 200,
    subtotalPrint: money(200),
    vatTotal: 14,
    vatPrint: money(14),
    total: 214,
    totalPrint: money(214),
    words: "Двісті чотирнадцять гривень 00 копійок",
    purpose: "Оплата огляду",
  }),
  base({
    id: "act-services",
    file: "act-services.pdf",
    documentType: "act",
    layout: "act",
    lang: "uk",
    title: "АКТ ВИКОНАНИХ РОБІТ",
    number: "АВ-310",
    dateIso: "2026-02-14",
    datePrint: "14.02.2026",
    seller: maple,
    buyer: shore,
    sellerRole: "performer",
    buyerRole: "customer",
    items: [line("Монтаж полиць", "год", 5, 100, 0.2, "20%")],
    subtotal: 500,
    subtotalPrint: money(500),
    vatTotal: 100,
    vatPrint: money(100),
    total: 600,
    totalPrint: money(600),
    words: "Шістсот гривень 00 копійок",
    purpose: "Оплата монтажу",
    note: "Підпис ________",
  }),
  base({
    id: "act-no-iban",
    file: "act-no-iban.pdf",
    documentType: "act",
    layout: "stack",
    lang: "uk",
    title: "АКТ ВИКОНАНИХ РОБІТ",
    number: "АВ-311",
    dateIso: "2026-03-01",
    datePrint: "01.03.2026",
    seller: { ...fop, iban: null },
    buyer: { ...shore, iban: null },
    sellerRole: "performer",
    buyerRole: "customer",
    items: [line("Підготовка звіту", "послуга", 2, 200, 0.2, "20%")],
    subtotal: 400,
    subtotalPrint: money(400),
    vatTotal: 80,
    vatPrint: money(80),
    total: 480,
    totalPrint: money(480),
    words: "Чотириста вісімдесят гривень 00 копійок",
    purpose: "Оплата звіту",
  }),
  base({
    id: "waybill-goods",
    file: "waybill-goods.pdf",
    documentType: "waybill",
    layout: "grid",
    lang: "uk",
    title: "ВИДАТКОВА НАКЛАДНА",
    number: "ВН-880",
    dateIso: "2026-01-28",
    datePrint: "28.01.2026",
    seller: field,
    buyer: maple,
    buyerRole: "receiver",
    items: [
      line("Папір А4", "пачка", 1, 80, 0, "0%"),
      line("Стрічка", "шт", 2, 40, 0, "0%"),
      line("Цвяхи", "кг", 1, 40, 0, "0%"),
    ],
    subtotal: 200,
    subtotalPrint: money(200),
    vatTotal: 0,
    vatPrint: money(0),
    total: 200,
    totalPrint: money(200),
    words: "Двісті гривень 00 копійок",
    purpose: "Оплата матеріалів",
  }),
  base({
    id: "waybill-russian",
    file: "waybill-russian.pdf",
    documentType: "waybill",
    layout: "grid",
    lang: "ru",
    title: "РАСХОДНАЯ НАКЛАДНАЯ",
    number: "РН-44",
    dateIso: "2026-02-19",
    datePrint: "19.02.2026",
    seller: quiet,
    buyer: field,
    buyerRole: "receiver",
    items: [line("Краска фасадная", "л", 3, 100, 0.2, "20%")],
    subtotal: 300,
    subtotalPrint: money(300),
    vatTotal: 60,
    vatPrint: money(60),
    total: 360,
    totalPrint: money(360),
    words: "Триста шестьдесят гривень 00 копеек",
    purpose: "Оплата краски",
  }),
  base({
    id: "invoice-twopage",
    file: "invoice-twopage.pdf",
    documentType: "invoice",
    layout: "split",
    lang: "uk",
    title: "РАХУНОК-ФАКТУРА",
    number: "КЛ-2209",
    dateIso: "2026-03-09",
    datePrint: "09.03.2026",
    seller: shore,
    buyer: field,
    headerPage: 1,
    linePage: 2,
    pages: 2,
    items: [line("Проєкт освітлення", "послуга", 2, 400, 0.2, "20%")],
    subtotal: 800,
    subtotalPrint: money(800),
    vatTotal: 160,
    vatPrint: money(160),
    total: 960,
    totalPrint: money(960),
    words: "Дев'ятсот шістдесят гривень 00 копійок",
    purpose: "Оплата проєкту",
  }),
  base({
    id: "waybill-open",
    file: "waybill-open.pdf",
    documentType: "waybill",
    layout: "table",
    lang: "uk",
    title: "ВИДАТКОВА НАКЛАДНА",
    number: "ВН-881",
    dateIso: "2026-01-07",
    datePrint: "07.01.2026",
    seller: maple,
    buyer: quiet,
    buyerRole: "receiver",
    items: [line("Зразок тканини", "м", 3, 280, 0, "0%")],
    subtotal: 840,
    subtotalPrint: money(840),
    vatTotal: 0,
    vatPrint: money(0),
    total: 840,
    totalPrint: money(840),
    words: "Вісімсот сорок гривень 00 копійок",
    purpose: null,
    note: "Вантаж прийнято без зауважень.",
  }),
  base({
    id: "invoice-scan",
    file: "invoice-scan.png",
    mimeType: "image/png",
    documentType: "invoice",
    layout: "scan",
    lang: "uk",
    title: "РАХУНОК",
    number: "СК-17",
    dateIso: "2026-02-27",
    datePrint: "27.02.2026",
    seller: maple,
    buyer: shore,
    items: [line("Перевірка архіву", "послуга", 1, 600, 0, "0%")],
    subtotal: 600,
    subtotalPrint: money(600),
    vatTotal: 0,
    vatPrint: money(0),
    total: 600,
    totalPrint: money(600),
    words: "Шістсот гривень 00 копійок",
    purpose: "Оплата перевірки",
  }),
  base({
    id: "invoice-bad-math",
    file: "invoice-bad-math.pdf",
    documentType: "invoice",
    layout: "ruled",
    lang: "uk",
    title: "РАХУНОК-ФАКТУРА",
    number: "КЛ-2212",
    dateIso: "2026-03-11",
    datePrint: "11.03.2026",
    seller: field,
    buyer: shore,
    items: [line("Ремонт сейфа", "год", 3, 100, 0.2, "20%", 250)],
    subtotal: 250,
    subtotalPrint: money(250),
    vatTotal: 50,
    vatPrint: money(50),
    total: 300,
    totalPrint: money(300),
    words: "Триста гривень 00 копійок",
    purpose: "Оплата ремонту",
    planted: [{ path: "lineItems[0].amount", code: "arithmetic-off" }],
  }),
];

export function buildCorpus() {
  const corpus = DOCUMENTS.map(present);
  if (corpus.length !== 12) {
    throw new Error(`expected 12 documents, got ${corpus.length}`);
  }
  return corpus;
}
