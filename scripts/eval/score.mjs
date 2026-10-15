const HEADER_KEYS = [
  "documentNumber",
  "issueDate",
  "currency",
  "subtotal",
  "vatTotal",
  "total",
  "totalInWords",
  "paymentPurpose",
];
const PARTY_KEYS = ["name", "edrpou", "ipn", "iban", "address"];
const LINE_KEYS = ["description", "unit", "quantity", "unitPrice", "vatRate", "amount"];

export function flattenFields(extraction) {
  const fields = [["documentType", extraction.documentType]];
  for (const key of HEADER_KEYS) {
    fields.push([key, extraction[key].value]);
  }
  for (const side of ["seller", "buyer"]) {
    for (const key of PARTY_KEYS) {
      fields.push([`${side}.${key}`, extraction[side][key].value]);
    }
  }
  fields.push(["lineItems.length", extraction.lineItems.length]);
  extraction.lineItems.forEach((line, index) => {
    for (const key of LINE_KEYS) {
      fields.push([`lineItems[${index}].${key}`, line[key].value]);
    }
  });
  return fields;
}

export function compareFields(expected, actual) {
  const left = flattenFields(expected);
  const right = new Map(flattenFields(actual));
  const missed = [];
  let matched = 0;
  for (const [path, value] of left) {
    if (right.has(path) && Object.is(right.get(path), value)) {
      matched += 1;
    } else {
      missed.push(path);
    }
    right.delete(path);
  }
  for (const path of right.keys()) {
    missed.push(path);
  }
  return { matched, total: matched + missed.length, missed };
}

export function catchPlanted(checks, planted) {
  const rows = planted.map((item) => ({
    path: item.path,
    code: item.code,
    caught: checks.some(
      (check) => check.status === "error" && check.path === item.path && check.code === item.code,
    ),
  }));
  return {
    caught: rows.filter((row) => row.caught).length,
    total: rows.length,
    rows,
  };
}

export function evidenceEntries(value, out = []) {
  if (!value || typeof value !== "object") {
    return out;
  }
  if ("evidence" in value && "page" in value && "value" in value) {
    if (typeof value.evidence === "string" && value.evidence) {
      out.push([value.evidence, value.page]);
    }
    return out;
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) evidenceEntries(item, out);
    } else {
      evidenceEntries(child, out);
    }
  }
  return out;
}
