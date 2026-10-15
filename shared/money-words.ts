import { normalizeAmountString } from "./normalize";

type Rank = "hundreds" | "tens" | "ones";

interface AddWord {
  op: "add";
  value: number;
  rank: Rank;
}

interface ScaleWord {
  op: "scale";
  scale: 1_000 | 1_000_000;
}

type Word =
  | AddWord
  | ScaleWord
  | { op: "mul100" }
  | { op: "skip" }
  | { op: "kopeck" };

const WORDS = new Map<string, Word>();

function add(words: string[], value: number, rank: Rank): void {
  for (const word of words) {
    WORDS.set(word, { op: "add", value, rank });
  }
}

function scale(words: string[], value: 1_000 | 1_000_000): void {
  for (const word of words) {
    WORDS.set(word, { op: "scale", scale: value });
  }
}

function mark(words: string[], word: Word): void {
  for (const entry of words) {
    WORDS.set(entry, word);
  }
}

add(["нуль", "ноль", "zero"], 0, "ones");
add(["один", "одна", "одне", "одно", "one", "a"], 1, "ones");
add(["два", "дві", "две", "two"], 2, "ones");
add(["три", "three"], 3, "ones");
add(["чотири", "четыре", "four"], 4, "ones");
add(["п'ять", "пять", "five"], 5, "ones");
add(["шість", "шесть", "six"], 6, "ones");
add(["сім", "семь", "seven"], 7, "ones");
add(["вісім", "восемь", "eight"], 8, "ones");
add(["дев'ять", "девять", "nine"], 9, "ones");
add(["десять", "ten"], 10, "tens");
add(["одинадцять", "одиннадцать", "eleven"], 11, "tens");
add(["дванадцять", "двенадцать", "twelve"], 12, "tens");
add(["тринадцять", "тринадцать", "thirteen"], 13, "tens");
add(["чотирнадцять", "четырнадцать", "fourteen"], 14, "tens");
add(["п'ятнадцять", "пятнадцать", "fifteen"], 15, "tens");
add(["шістнадцять", "шестнадцать", "sixteen"], 16, "tens");
add(["сімнадцять", "семнадцать", "seventeen"], 17, "tens");
add(["вісімнадцять", "восемнадцать", "eighteen"], 18, "tens");
add(["дев'ятнадцять", "девятнадцать", "nineteen"], 19, "tens");
add(["двадцять", "двадцать", "twenty"], 20, "tens");
add(["тридцять", "тридцать", "thirty"], 30, "tens");
add(["сорок", "forty"], 40, "tens");
add(["п'ятдесят", "пятьдесят", "fifty"], 50, "tens");
add(["шістдесят", "шестьдесят", "sixty"], 60, "tens");
add(["сімдесят", "семьдесят", "seventy"], 70, "tens");
add(["вісімдесят", "восемьдесят", "eighty"], 80, "tens");
add(["дев'яносто", "девяносто", "ninety"], 90, "tens");
add(["сто"], 100, "hundreds");
add(["двісті", "двести"], 200, "hundreds");
add(["триста"], 300, "hundreds");
add(["чотириста", "четыреста"], 400, "hundreds");
add(["п'ятсот", "пятьсот"], 500, "hundreds");
add(["шістсот", "шестьсот"], 600, "hundreds");
add(["сімсот", "семьсот"], 700, "hundreds");
add(["вісімсот", "восемьсот"], 800, "hundreds");
add(["дев'ятсот", "девятьсот"], 900, "hundreds");

mark(["hundred"], { op: "mul100" });
scale(["тисяча", "тисячі", "тисяч", "тис", "тысяча", "тысячи", "тысяч", "thousand"], 1_000);
scale(
  ["мільйон", "мільйона", "мільйони", "мільйонів", "млн", "миллион", "миллиона", "миллионы", "миллионов", "million"],
  1_000_000,
);
mark(
  [
    "грн",
    "гривня",
    "гривні",
    "гривень",
    "гривнях",
    "uah",
    "hryvnia",
    "hryvnias",
    "dollar",
    "dollars",
    "euro",
    "euros",
    "рубль",
    "рубля",
    "рублей",
    "та",
    "й",
    "і",
    "and",
  ],
  { op: "skip" },
);
mark(
  ["коп", "копійка", "копійки", "копійок", "копійках", "копейка", "копейки", "копеек", "kopeck", "kopecks"],
  { op: "kopeck" },
);

const PREFIX = new Set(["всього", "разом", "усього", "итого", "total", "сума", "сумма"]);

interface Group {
  value: number;
  hundreds: boolean;
  tens: boolean;
  ones: boolean;
  touched: boolean;
}

function emptyGroup(): Group {
  return { value: 0, hundreds: false, tens: false, ones: false, touched: false };
}

function tokenize(input: string): string[] {
  const folded = input
    .toLowerCase()
    .replace(/[’'`ʼ′]/g, "'")
    .replace(/ё/g, "е");
  return folded
    .replace(/[;:()«»"—–−]/g, " ")
    .replace(/[.,](?!\d)/g, " ")
    .replace(/(?<!\d)[.,]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

function parseDigitTokens(tokens: string[]): number | null {
  if (tokens.length === 1) {
    return normalizeAmountString(tokens[0] ?? "");
  }
  const last = tokens[tokens.length - 1] ?? "";
  const lastMatch = /^(\d+)(?:[.,](\d+))?$/.exec(last);
  const head = tokens.slice(0, -1);
  if (!lastMatch || !head.every((token) => /^\d{1,3}$/.test(token))) {
    return null;
  }
  const integerPart = lastMatch[1] ?? "";
  if (integerPart.length !== 3) {
    return null;
  }
  if (head.length > 1 && !head.slice(1).every((token) => token.length === 3)) {
    return null;
  }
  const integer = [...head, integerPart].join("");
  const fraction = lastMatch[2];
  if (fraction != null) {
    return normalizeAmountString(`${integer}.${fraction}`);
  }
  return Number(integer);
}

function applyAdd(group: Group, value: number, rank: Rank): boolean {
  if (rank === "hundreds") {
    if (group.hundreds || group.tens || group.ones) {
      return false;
    }
    group.hundreds = true;
  } else if (rank === "tens") {
    if (group.tens || group.ones) {
      return false;
    }
    group.tens = true;
  } else if (group.ones) {
    return false;
  } else {
    const rest = group.value % 100;
    if (group.tens && rest >= 10 && rest < 20) {
      return false;
    }
    group.ones = true;
  }
  group.value += value;
  group.touched = true;
  return true;
}

function applyHundred(group: Group): boolean {
  if (group.hundreds || group.tens) {
    return false;
  }
  if (group.ones && (group.value < 1 || group.value > 9)) {
    return false;
  }
  group.value = (group.touched ? group.value : 1) * 100;
  group.hundreds = true;
  group.tens = false;
  group.ones = false;
  group.touched = true;
  return true;
}

function parseWords(tokens: string[]): number | null {
  const meaningful = tokens.filter((token) => WORDS.get(token)?.op !== "skip");
  if (meaningful.length === 0) {
    return null;
  }
  if (meaningful.every((token) => /^\d+$/.test(token) || /^\d+[.,]\d+$/.test(token))) {
    return parseDigitTokens(meaningful);
  }

  let total = 0;
  let group = emptyGroup();
  let sawThousand = false;
  let sawMillion = false;

  for (const token of meaningful) {
    const word = WORDS.get(token);
    if (!word || word.op === "kopeck") {
      return null;
    }
    if (word.op === "add") {
      if (!applyAdd(group, word.value, word.rank)) {
        return null;
      }
      continue;
    }
    if (word.op === "mul100") {
      if (!applyHundred(group)) {
        return null;
      }
      continue;
    }
    // Skips and kopeck markers are removed before this loop.
    const scaleWord = word as Extract<Word, { op: "scale" }>;
    if (scaleWord.scale === 1_000_000) {
      if (sawMillion || sawThousand) {
        return null;
      }
      total += (group.touched ? group.value : 1) * scaleWord.scale;
      sawMillion = true;
    } else {
      if (sawThousand) {
        return null;
      }
      total += (group.touched ? group.value : 1) * scaleWord.scale;
      sawThousand = true;
    }
    group = emptyGroup();
  }

  return total + group.value;
}

function isMinorToken(token: string): boolean {
  if (/^\d{1,2}$/.test(token)) {
    return true;
  }
  const word = WORDS.get(token);
  return word?.op === "add" && word.rank !== "hundreds";
}

/**
 * Parses a closed set of Ukrainian, Russian, and English amount phrases.
 * Returns null when the phrase is outside that set.
 */
export function parseAmountInWords(input: string): number | null {
  if (!input.trim()) {
    return null;
  }
  const tokens = tokenize(input);
  if (tokens[0] && PREFIX.has(tokens[0])) {
    tokens.shift();
  }
  if (tokens.length === 0) {
    return null;
  }

  const kopeckAt = tokens.findIndex((token) => WORDS.get(token)?.op === "kopeck");
  let major = tokens;
  const minor: string[] = [];
  if (kopeckAt >= 0) {
    major = tokens.slice(0, kopeckAt);
    while (major.length > 0) {
      const last = major[major.length - 1];
      if (!last || !isMinorToken(last)) {
        break;
      }
      minor.unshift(last);
      major.pop();
    }
    if (minor.length === 0) {
      return null;
    }
  }

  const majorMeaningful = major.filter((token) => WORDS.get(token)?.op !== "skip");
  const majorValue = majorMeaningful.length === 0 ? 0 : parseWords(major);
  if (majorValue == null) {
    return null;
  }

  if (kopeckAt < 0) {
    return majorValue;
  }
  const minorValue = parseWords(minor);
  if (minorValue == null || minorValue < 0 || minorValue > 99 || !Number.isInteger(minorValue)) {
    return null;
  }
  return majorValue + minorValue / 100;
}

export function compareAmountInWords(
  phrase: string,
  total: number,
): "match" | "mismatch" | "unchecked" {
  const parsed = parseAmountInWords(phrase);
  if (parsed == null) {
    return "unchecked";
  }
  return Math.abs(parsed - total) <= 0.01 + 1e-9 ? "match" : "mismatch";
}
