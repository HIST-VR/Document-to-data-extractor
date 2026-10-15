export type IdCheck = { ok: true } | { ok: false; reason: "format" | "checksum" };

function digitsOnly(value: string): string {
  return value.replace(/[\s\u00A0\u202F]/g, "");
}

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * ЄДРПОУ check digit used by accounting software.
 * The State Tax Service has not published an official algorithm.
 * Weights are 1..7 outside 30_000_000–60_000_000, otherwise 7,1,2,3,4,5,6.
 * If the remainder is 10, add 2 to each weight and repeat. A second 10 becomes 0.
 */
export function checkEdrpou(value: string): IdCheck {
  const code = digitsOnly(value);
  if (!/^\d{8}$/.test(code)) {
    return { ok: false, reason: "format" };
  }

  const numeric = Number(code);
  const base = numeric < 30_000_000 || numeric > 60_000_000
    ? [1, 2, 3, 4, 5, 6, 7]
    : [7, 1, 2, 3, 4, 5, 6];

  let check = weightedMod11(code, base);
  if (check === 10) {
    check = weightedMod11(code, base.map((weight) => weight + 2));
    if (check === 10) {
      check = 0;
    }
  }

  if (check !== Number(code[7])) {
    return { ok: false, reason: "checksum" };
  }
  return { ok: true };
}

function weightedMod11(code: string, weights: number[]): number {
  let sum = 0;
  for (let index = 0; index < 7; index += 1) {
    sum += Number(code[index]) * (weights[index] ?? 0);
  }
  return sum % 11;
}

/**
 * ІПН / РНОКПП check digit used across published parsers.
 * Weights on the first 9 digits: -1, 5, 7, 9, 4, 6, 10, 5, 7.
 * Check digit is (sum mod 11) mod 10. Not an official STS publication.
 */
export function checkIpn(value: string): IdCheck {
  const code = digitsOnly(value);
  if (!/^\d{10}$/.test(code)) {
    return { ok: false, reason: "format" };
  }

  const weights = [-1, 5, 7, 9, 4, 6, 10, 5, 7];
  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(code[index]) * (weights[index] ?? 0);
  }
  const check = positiveMod(positiveMod(sum, 11), 10);
  if (check !== Number(code[9])) {
    return { ok: false, reason: "checksum" };
  }
  return { ok: true };
}

/** UA IBAN: 29 characters, ISO 13616 MOD 97-10, remainder 1. */
export function checkIban(value: string): IdCheck {
  const code = value.replace(/[\s\u00A0\u202F]/g, "").toUpperCase();
  if (!/^UA\d{27}$/.test(code)) {
    return { ok: false, reason: "format" };
  }

  const rearranged = code.slice(4) + code.slice(0, 4);
  let numeric = "";
  for (const character of rearranged) {
    if (character >= "A" && character <= "Z") {
      numeric += (character.charCodeAt(0) - 55).toString();
    } else {
      numeric += character;
    }
  }

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  if (remainder !== 1) {
    return { ok: false, reason: "checksum" };
  }
  return { ok: true };
}
