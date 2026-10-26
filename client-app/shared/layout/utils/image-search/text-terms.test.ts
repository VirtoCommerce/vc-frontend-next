import { describe, expect, it } from "vitest";
import { extractSearchTerms, splitTypedText } from "./text-terms";

describe("extractSearchTerms", () => {
  it("keeps confident brand and model words, best first", () => {
    expect(
      extractSearchTerms([
        { text: "UGREEN", confidence: 95 },
        { text: "Nexode", confidence: 90 },
        { text: "20000mAh", confidence: 88 },
      ]),
    ).toEqual(["20000mAh", "UGREEN", "Nexode"]);
  });

  it("drops unsure, short, numeric and generic words", () => {
    expect(
      extractSearchTerms([
        { text: "Anker", confidence: 40 },
        { text: "ok", confidence: 99 },
        { text: "2024", confidence: 99 },
        { text: "with", confidence: 99 },
        { text: "Logitech", confidence: 91 },
      ]),
    ).toEqual(["Logitech"]);
  });

  it("strips punctuation around a word and removes duplicates", () => {
    expect(
      extractSearchTerms([
        { text: "(Samsung)", confidence: 90 },
        { text: "SAMSUNG,", confidence: 85 },
      ]),
    ).toEqual(["Samsung"]);
  });
});

describe("splitTypedText", () => {
  it("splits typed text into terms by the same rules", () => {
    expect(splitTypedText("  Jabra   speak2 for  ")).toEqual(["speak2", "Jabra"]);
  });
});
