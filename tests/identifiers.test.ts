import { describe, expect, it } from "vitest";
import { checkEdrpou, checkIban, checkIpn } from "../shared/identifiers";

describe("ЄДРПОУ", () => {
  it("accepts PrivatBank and a code in the 30–60 million weight band", () => {
    expect(checkEdrpou("14360570")).toEqual({ ok: true });
    expect(checkEdrpou("30000005")).toEqual({ ok: true });
  });

  it("accepts a code whose first remainder is 10 and whose second remainder is 10", () => {
    expect(checkEdrpou("00002810")).toEqual({ ok: true });
  });

  it("strips spaces before checking", () => {
    expect(checkEdrpou("1436 0570")).toEqual({ ok: true });
  });

  it("rejects a bad check digit and a bad shape", () => {
    expect(checkEdrpou("14360571")).toEqual({ ok: false, reason: "checksum" });
    expect(checkEdrpou("30000006")).toEqual({ ok: false, reason: "checksum" });
    expect(checkEdrpou("1436057")).toEqual({ ok: false, reason: "format" });
    expect(checkEdrpou("1436057A")).toEqual({ ok: false, reason: "format" });
    expect(checkEdrpou("")).toEqual({ ok: false, reason: "format" });
  });
});

describe("ІПН", () => {
  it("accepts the community check digit, including a negative weighted sum", () => {
    expect(checkIpn("1234567899")).toEqual({ ok: true });
    expect(checkIpn("9000000002")).toEqual({ ok: true });
    expect(checkIpn("900 000 0002")).toEqual({ ok: true });
  });

  it("rejects a bad check digit and a bad shape", () => {
    expect(checkIpn("1234567890")).toEqual({ ok: false, reason: "checksum" });
    expect(checkIpn("9000000000")).toEqual({ ok: false, reason: "checksum" });
    expect(checkIpn("123456789")).toEqual({ ok: false, reason: "format" });
    expect(checkIpn("123456789X")).toEqual({ ok: false, reason: "format" });
  });
});

describe("UA IBAN", () => {
  it("accepts the ISO example with spaces and lowercase", () => {
    expect(checkIban("UA213223130000026007233566001")).toEqual({ ok: true });
    expect(checkIban("ua21 3223 1300 0002 6007 2335 6600 1")).toEqual({ ok: true });
  });

  it("rejects a bad check and a bad shape", () => {
    expect(checkIban("UA213223130000026007233566002")).toEqual({ ok: false, reason: "checksum" });
    expect(checkIban("DE213223130000026007233566001")).toEqual({ ok: false, reason: "format" });
    expect(checkIban("UA21322313000002600723356600")).toEqual({ ok: false, reason: "format" });
    expect(checkIban("UA21322313000002600723356600A")).toEqual({ ok: false, reason: "format" });
  });
});
