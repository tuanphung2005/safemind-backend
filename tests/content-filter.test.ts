import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { 
  normalizeVietnameseText, 
  extractDangerKeywords,
  hasDangerSignal,
} from "../src/shared/safety/content-filter";

const input = "Tôi bị đánh và bị đâm bởi một người lạ";

describe("normalize vietnamese text", () => {
  it("should normalize vietnamese text correctly", async() => {
    const result = await normalizeVietnameseText(input);
    expect(result).toBe("toi bi danh va bi dam boi mot nguoi la");
  })
})

describe("extract danger keywords", () => {
  it("should extract danger keywords correctly", async() => {
    const result = await extractDangerKeywords(input);
    expect(result).toEqual(["đánh", "bị đánh", "đâm"]);
  })
})

describe("has danger signal", () => {
  it("should return true if there are danger keywords", async() => {
    const result = await hasDangerSignal(input);
    expect(result).toBe(true);
  })
})