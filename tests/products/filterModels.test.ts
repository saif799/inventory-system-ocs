import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  clearedFilters,
  countVariants,
  filterModels,
  isFiltered,
  parseArchived,
  parseFilters,
  parseImages,
  parsePrice,
  parseStock,
  serializeFilters,
  type ProductFilters,
} from "@/app/admin/(admin)/products/params";
import type { ModelRow, VariantRow } from "@/app/admin/(admin)/products/types";

function variant(overrides: Partial<VariantRow> = {}): VariantRow {
  return {
    shoeId: overrides.color ?? "sku",
    color: "black",
    priceOverride: null,
    compareAtPriceOverride: null,
    effectivePrice: 5000,
    imageCount: 2,
    totalStock: 4,
    hasPrice: true,
    archived: false,
    ...overrides,
  };
}

function model(name: string, variants: VariantRow[], archived = false): ModelRow {
  return {
    modelId: name,
    modelName: name,
    basePrice: 5000,
    compareAtPrice: null,
    archived,
    variants,
  };
}

const filters = (patch: Partial<ProductFilters> = {}): ProductFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe("parsing the URL contract", () => {
  it("falls back to the default for absent and junk values", () => {
    expect(parsePrice(null)).toBe("all");
    expect(parsePrice("nonsense")).toBe("all");
    expect(parseImages(undefined)).toBe("all");
    expect(parseArchived(null)).toBe("active");
    // stock is the one control whose default is not "all".
    expect(parseStock(null)).toBe("in");
    expect(parseStock("in")).toBe("in");
  });

  it("reads the whole state off search params", () => {
    const state = parseFilters(new URLSearchParams("q=air&price=unpriced&stock=all&archived=1"));
    expect(state).toEqual({
      q: "air",
      price: "unpriced",
      images: "all",
      stock: "all",
      archived: "archived",
    });
  });

  it("treats only the defaults as unfiltered", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered(filters({ q: "   " }))).toBe(false);
    expect(isFiltered(filters({ q: "air" }))).toBe(true);
    expect(isFiltered(filters({ stock: "all" }))).toBe(true);
    expect(isFiltered(filters({ archived: "archived" }))).toBe(true);
  });
});

describe("serializing back to the URL", () => {
  it("drops defaults and only touches the keys the patch names", () => {
    expect(serializeFilters({ price: "unpriced", stock: "all" })).toEqual({
      price: "unpriced",
      stock: "all",
    });
    expect(serializeFilters({ price: "all" })).toEqual({ price: null });
    // "in" is stock's default, so it is never written.
    expect(serializeFilters({ stock: "in" })).toEqual({ stock: null });
    expect(serializeFilters({ q: "" })).toEqual({ q: null });
  });

  it("encodes the archived scope as ?archived=1, absent when active", () => {
    expect(serializeFilters({ archived: "archived" })).toEqual({ archived: "1" });
    expect(serializeFilters({ archived: "active" })).toEqual({ archived: null });
  });

  it("round-trips through parseFilters", () => {
    const state = filters({ q: "air", price: "unpriced", stock: "out", archived: "archived" });
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(serializeFilters(state))) {
      if (value !== null) params.set(key, value);
    }
    expect(parseFilters(params)).toEqual(state);
  });

  it("clears every key it owns", () => {
    expect(clearedFilters()).toEqual({
      q: null,
      price: null,
      images: null,
      stock: null,
      archived: null,
    });
  });
});

describe("the archived scope", () => {
  const liveVariant = variant({ color: "live" });
  const archivedVariant = variant({ color: "old", archived: true });
  const models = [
    model("Live model", [liveVariant, archivedVariant]),
    model("Dead model", [variant({ color: "dead" })], true),
  ];

  it("hides archived models and archived variants by default", () => {
    const result = filterModels(models, filters());
    expect(result.map((m) => m.modelName)).toEqual(["Live model"]);
    expect(result[0].variants.map((v) => v.color)).toEqual(["live"]);
  });

  it("shows an archived model with all its variants, and live models' archived variants only", () => {
    const result = filterModels(models, filters({ archived: "archived" }));
    expect(result.map((m) => m.modelName)).toEqual(["Live model", "Dead model"]);
    expect(result[0].variants.map((v) => v.color)).toEqual(["old"]);
    expect(result[1].variants.map((v) => v.color)).toEqual(["dead"]);
  });
});

describe("search", () => {
  const models = [
    model("Air Force 1", [variant({ color: "white" })]),
    model("Samba OG", [variant({ color: "black" })]),
  ];

  it("matches the model name case-insensitively and keeps every surviving variant", () => {
    const result = filterModels(models, filters({ q: "force" }));
    expect(result.map((m) => m.modelName)).toEqual(["Air Force 1"]);
    expect(result[0].variants).toHaveLength(1);
  });

  it("does not match colour", () => {
    expect(filterModels(models, filters({ q: "white" }))).toHaveLength(0);
  });
});

describe("price, images and stock", () => {
  const models = [
    model("Model", [
      variant({ color: "priced", hasPrice: true, imageCount: 1, totalStock: 3 }),
      variant({ color: "unpriced", hasPrice: false, imageCount: 0, totalStock: 0 }),
    ]),
  ];

  it("defaults to in-stock only", () => {
    const result = filterModels(models, filters());
    expect(result[0].variants.map((v) => v.color)).toEqual(["priced"]);
  });

  it("composes with AND", () => {
    expect(
      filterModels(models, filters({ price: "unpriced", stock: "all" }))[0].variants.map(
        (v) => v.color,
      ),
    ).toEqual(["unpriced"]);
    // unpriced AND in-stock matches nothing, so the whole model drops out.
    expect(filterModels(models, filters({ price: "unpriced" }))).toHaveLength(0);
  });

  it("filters on images and on out-of-stock", () => {
    expect(
      filterModels(models, filters({ images: "without", stock: "all" }))[0].variants.map(
        (v) => v.color,
      ),
    ).toEqual(["unpriced"]);
    expect(
      filterModels(models, filters({ stock: "out" }))[0].variants.map((v) => v.color),
    ).toEqual(["unpriced"]);
  });

  it("drops a model when no variant survives", () => {
    expect(filterModels(models, filters({ images: "without" }))).toHaveLength(0);
  });
});

describe("the banner contract", () => {
  // The banners count unpriced/unphotographed live variants regardless of
  // stock, so clicking one must land on a filter state whose list length
  // equals the banner's number — hence the stock=all reset.
  const models = [
    model("A", [
      variant({ color: "a1", hasPrice: false, totalStock: 0 }),
      variant({ color: "a2", hasPrice: false, totalStock: 5 }),
    ]),
    model("B", [variant({ color: "b1", hasPrice: false, totalStock: 0, archived: true })]),
    model("C", [variant({ color: "c1", hasPrice: false })], true),
  ];

  const bannerCount = models.reduce(
    (sum, m) =>
      sum + (m.archived ? 0 : m.variants.filter((v) => !v.archived && !v.hasPrice).length),
    0,
  );

  it("shows exactly as many products as the banner claims", () => {
    const result = filterModels(models, filters({ price: "unpriced", stock: "all" }));
    const shown = countVariants(result);
    expect(bannerCount).toBe(2);
    expect(shown).toBe(bannerCount);
  });
});
