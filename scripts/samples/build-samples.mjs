import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "public", "samples");
const fontBytes = await readFile(join(root, "scripts", "samples", "fonts", "Onest-Variable.ttf"));

const seller = {
  name: "ТОВ «Сонячний Двір»",
  edrpou: "38472917",
  ipn: "2847561938",
  iban: "UA583052990000002600123456789",
  address: "вул. Липова, 12, м. Львів, 79000",
};

const buyer = {
  name: "ТОВ «Тиха Гавань»",
  edrpou: "41285063",
  ipn: "3192847561",
  iban: "UA903220010000002600987654321",
  address: "просп. Миру, 8, м. Одеса, 65000",
};

function sourced(value, evidence, page) {
  return { value, evidence, page };
}

function partyData(party, page) {
  return {
    name: sourced(party.name, party.name, page),
    edrpou: sourced(party.edrpou, party.edrpou, page),
    ipn: sourced(party.ipn, party.ipn, page),
    iban: sourced(party.iban, party.iban, page),
    address: sourced(party.address, party.address, page),
  };
}

function partyLines(label, party) {
  return [label, party.name, `ЄДРПОУ ${party.edrpou}`, `ІПН ${party.ipn}`, `IBAN ${party.iban}`, `Адреса: ${party.address}`];
}

function goods(item, page) {
  const unitLine = `Од. ${item.unit}`;
  const qtyLine = `Кількість ${item.quantity}`;
  const priceLine = `Ціна ${item.pricePrint}`;
  const vatLine = `ПДВ ${item.vatPrint}`;
  const amountLine = `Сума ${item.amountPrint}`;
  return {
    lines: [item.description, unitLine, qtyLine, priceLine, vatLine, amountLine],
    data: {
      description: sourced(item.description, item.description, page),
      unit: sourced(item.unit, unitLine, page),
      quantity: sourced(item.quantity, qtyLine, page),
      unitPrice: sourced(item.unitPrice, priceLine, page),
      vatRate: sourced(item.vatRate, vatLine, page),
      amount: sourced(item.amount, amountLine, page),
    },
  };
}

function documentData({ type, number, numberLine, dateIso, datePrint, currencyLine, sellerLabel, buyerLabel, items, subtotal, vatTotal, total, words, purpose, page }) {
  const subtotalLine = `Разом без ПДВ: ${subtotal.print}`;
  const vatLine = `ПДВ: ${vatTotal.print}`;
  const totalLine = `Всього: ${total.print}`;
  const wordsLine = `Сума прописом: ${words}`;
  const purposeLine = `Призначення платежу: ${purpose}`;
  const rendered = items.map((item) => goods(item, page));
  const lines = [
    type.title,
    numberLine,
    `Дата: ${datePrint}`,
    currencyLine,
    "",
    ...partyLines(sellerLabel, seller),
    "",
    ...partyLines(buyerLabel, buyer),
  ];
  for (const item of rendered) {
    lines.push("", ...item.lines);
  }
  lines.push("", subtotalLine, vatLine, totalLine, wordsLine, purposeLine);
  return {
    lines,
    data: {
      documentType: type.id,
      documentNumber: sourced(number, numberLine, page),
      issueDate: sourced(dateIso, datePrint, page),
      currency: sourced("UAH", "UAH", page),
      seller: partyData(seller, page),
      buyer: partyData(buyer, page),
      lineItems: rendered.map((item) => item.data),
      subtotal: sourced(subtotal.value, subtotalLine, page),
      vatTotal: sourced(vatTotal.value, vatLine, page),
      total: sourced(total.value, totalLine, page),
      totalInWords: sourced(words, words, page),
      paymentPurpose: sourced(purpose, purpose, page),
    },
  };
}

const invoice = documentData({
  type: { id: "invoice", title: "РАХУНОК-ФАКТУРА" },
  number: "СД-1042",
  numberLine: "№ СД-1042",
  dateIso: "2026-03-16",
  datePrint: "16.03.2026",
  currencyLine: "Валюта: UAH",
  sellerLabel: "Постачальник",
  buyerLabel: "Покупець",
  page: 1,
  items: [
    {
      description: "Консультація з обліку",
      unit: "год",
      quantity: 4,
      unitPrice: 1500,
      pricePrint: "1 500,00",
      vatRate: 0.2,
      vatPrint: "20%",
      amount: 6000,
      amountPrint: "6 000,00",
    },
    {
      description: "Підготовка звіту",
      unit: "послуга",
      quantity: 1,
      unitPrice: 2400,
      pricePrint: "2 400,00",
      vatRate: 0.2,
      vatPrint: "20%",
      amount: 2400,
      amountPrint: "2 400,00",
    },
  ],
  subtotal: { value: 8400, print: "8 400,00" },
  vatTotal: { value: 1680, print: "1 680,00" },
  total: { value: 10080, print: "10 080,00" },
  words: "Десять тисяч вісімдесят гривень 00 копійок",
  purpose: "Оплата за консультаційні послуги",
});

const act = documentData({
  type: { id: "act", title: "АКТ ВИКОНАНИХ РОБІТ" },
  number: "АВ-77",
  numberLine: "№ АВ-77",
  dateIso: "2026-02-02",
  datePrint: "02.02.2026",
  currencyLine: "Валюта: UAH",
  sellerLabel: "Виконавець",
  buyerLabel: "Замовник",
  page: 1,
  items: [
    {
      description: "Розробка модуля звітності",
      unit: "послуга",
      quantity: 1,
      unitPrice: 5000,
      pricePrint: "5 000,00",
      vatRate: 0,
      vatPrint: "0%",
      amount: 5000,
      amountPrint: "5 000,00",
    },
  ],
  subtotal: { value: 5000, print: "5 000,00" },
  vatTotal: { value: 0, print: "0,00" },
  total: { value: 5000, print: "5 000,00" },
  words: "П\u02BCять тисяч гривень 00 копійок",
  purpose: "Оплата за актом АВ-77",
});

const waybill = documentData({
  type: { id: "waybill", title: "ВИДАТКОВА НАКЛАДНА" },
  number: "ВН-318",
  numberLine: "№ ВН-318",
  dateIso: "2026-01-11",
  datePrint: "11.01.2026",
  currencyLine: "Валюта: UAH",
  sellerLabel: "Постачальник",
  buyerLabel: "Одержувач",
  page: 1,
  items: [
    {
      description: "Папір офісний А4",
      unit: "пачка",
      quantity: 10,
      unitPrice: 200,
      pricePrint: "200,00",
      vatRate: 0.2,
      vatPrint: "20%",
      amount: 2000,
      amountPrint: "2 000,00",
    },
    {
      description: "Ручка кулькова",
      unit: "шт",
      quantity: 4,
      unitPrice: 190,
      pricePrint: "190,00",
      vatRate: 0.2,
      vatPrint: "20%",
      amount: 760,
      amountPrint: "760,00",
    },
  ],
  subtotal: { value: 2760, print: "2 760,00" },
  vatTotal: { value: 552, print: "552,00" },
  total: { value: 3312, print: "3 312,00" },
  words: "Три тисячі триста дванадцять гривень 00 копійок",
  purpose: "Оплата за товар за накладною ВН-318",
});

function csvDocument() {
  const rows = [
    "Документ;Рахунок",
    "Номер;ЕКС-15",
    "Дата;01.06.2026",
    "Валюта;UAH",
    `Постачальник;${seller.name}`,
    `ЄДРПОУ;${seller.edrpou}`,
    `ІПН;${seller.ipn}`,
    `IBAN;${seller.iban}`,
    `Адреса;${seller.address}`,
    `Покупець;${buyer.name}`,
    `ЄДРПОУ покупця;${buyer.edrpou}`,
    `ІПН покупця;${buyer.ipn}`,
    `IBAN покупця;${buyer.iban}`,
    `Адреса покупця;${buyer.address}`,
    "Опис;Супровід облікової системи",
    "Одиниця;міс",
    "Кількість;3",
    "Ціна;100,00",
    "ПДВ;20%",
    "Сума;300,00",
    "Разом без ПДВ;300,00",
    "ПДВ сума;60,00",
    "Всього;360,00",
    "Сума прописом;Триста шістдесят гривень 00 копійок",
    "Призначення;Оплата за супровід за червень 2026",
  ];
  const page = null;
  return {
    text: `${rows.join("\n")}\n`,
    data: {
      documentType: "invoice",
      documentNumber: sourced("ЕКС-15", "Номер;ЕКС-15", page),
      issueDate: sourced("2026-06-01", "01.06.2026", page),
      currency: sourced("UAH", "Валюта;UAH", page),
      seller: {
        name: sourced(seller.name, `Постачальник;${seller.name}`, page),
        edrpou: sourced(seller.edrpou, `ЄДРПОУ;${seller.edrpou}`, page),
        ipn: sourced(seller.ipn, `ІПН;${seller.ipn}`, page),
        iban: sourced(seller.iban, `IBAN;${seller.iban}`, page),
        address: sourced(seller.address, `Адреса;${seller.address}`, page),
      },
      buyer: {
        name: sourced(buyer.name, `Покупець;${buyer.name}`, page),
        edrpou: sourced(buyer.edrpou, `ЄДРПОУ покупця;${buyer.edrpou}`, page),
        ipn: sourced(buyer.ipn, `ІПН покупця;${buyer.ipn}`, page),
        iban: sourced(buyer.iban, `IBAN покупця;${buyer.iban}`, page),
        address: sourced(buyer.address, `Адреса покупця;${buyer.address}`, page),
      },
      lineItems: [
        {
          description: sourced("Супровід облікової системи", "Опис;Супровід облікової системи", page),
          unit: sourced("міс", "Одиниця;міс", page),
          quantity: sourced(3, "Кількість;3", page),
          unitPrice: sourced(100, "Ціна;100,00", page),
          vatRate: sourced(0.2, "ПДВ;20%", page),
          amount: sourced(300, "Сума;300,00", page),
        },
      ],
      subtotal: sourced(300, "Разом без ПДВ;300,00", page),
      vatTotal: sourced(60, "ПДВ сума;60,00", page),
      total: sourced(360, "Всього;360,00", page),
      totalInWords: sourced("Триста шістдесят гривень 00 копійок", "Триста шістдесят гривень 00 копійок", page),
      paymentPurpose: sourced("Оплата за супровід за червень 2026", "Призначення;Оплата за супровід за червень 2026", page),
    },
  };
}

function collectEvidence(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectEvidence(item, found);
    return found;
  }
  if (!node || typeof node !== "object") return found;
  if ("page" in node && "evidence" in node && "value" in node) {
    if (typeof node.evidence === "string") found.push(node.evidence);
    return found;
  }
  for (const child of Object.values(node)) collectEvidence(child, found);
  return found;
}

function assertPrinted(label, text, data) {
  for (const evidence of collectEvidence(data)) {
    if (!text.includes(evidence)) {
      throw new Error(`${label} is missing printed evidence: ${evidence}`);
    }
  }
}

async function writePdf(filename, title, lines) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(title);
  pdf.setAuthor("DocLens UA");
  pdf.setCreationDate(new Date("2026-01-11T00:00:00Z"));
  pdf.setModificationDate(new Date("2026-01-11T00:00:00Z"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(20 / 255, 18 / 255, 15 / 255);
  page.drawLine({
    start: { x: 48, y: 808 },
    end: { x: 547, y: 808 },
    thickness: 1,
    color: ink,
  });
  let y = 780;
  lines.forEach((line, index) => {
    if (!line) {
      y -= 8;
      return;
    }
    const size = index === 0 ? 16 : 11;
    const width = font.widthOfTextAtSize(line, size);
    if (width > 500) throw new Error(`Too wide (${width.toFixed(1)}): ${line}`);
    if (y < 48) throw new Error(`Overflow before: ${line}`);
    page.drawText(line, { x: 48, y, size, font, color: ink });
    y -= size === 16 ? 26 : 16;
  });
  await writeFile(join(outDir, filename), await pdf.save());
}

await mkdir(outDir, { recursive: true });

const pdfs = [
  ["invoice.pdf", "Рахунок-фактура СД-1042", invoice],
  ["act.pdf", "Акт виконаних робіт АВ-77", act],
  ["waybill.pdf", "Видаткова накладна ВН-318", waybill],
];

for (const [filename, title, document] of pdfs) {
  const printed = document.lines.filter(Boolean).join("\n");
  assertPrinted(filename, printed, document.data);
  await writePdf(filename, title, document.lines);
  await writeFile(join(outDir, filename.replace(".pdf", ".json")), `${JSON.stringify(document.data, null, 2)}\n`);
}

const exported = csvDocument();
assertPrinted("export.csv", exported.text, exported.data);
await writeFile(join(outDir, "export.csv"), exported.text);
await writeFile(join(outDir, "export.json"), `${JSON.stringify(exported.data, null, 2)}\n`);

console.log("Wrote four sample documents to public/samples");
