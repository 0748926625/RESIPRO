import { describe, expect, it } from "vitest";

import { slugify, storagePathFromPublicUrl } from "@/lib/services/property.service";

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("Résidence Élégance à Cocody")).toBe("residence-elegance-a-cocody");
  });

  it("collapses non-alphanumeric runs into single hyphens", () => {
    expect(slugify("  Studio #12 !!")).toBe("studio-12");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--Villa--")).toBe("villa");
  });
});

describe("storagePathFromPublicUrl", () => {
  it("extracts the object path after the bucket segment", () => {
    expect(
      storagePathFromPublicUrl(
        "https://xyz.supabase.co/storage/v1/object/public/property-images/abc-123/photo.jpg",
      ),
    ).toBe("abc-123/photo.jpg");
  });

  it("returns the input unchanged if the bucket segment is absent", () => {
    expect(storagePathFromPublicUrl("https://example.com/photo.jpg")).toBe(
      "https://example.com/photo.jpg",
    );
  });
});
