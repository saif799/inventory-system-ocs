import { describe, expect, it } from "vitest";

import {
  buildGroups,
  fieldsDirty,
  groupSelection,
  itemsDirty,
  moveItem,
  storefrontStatus,
  toggleGroup,
  type EditorBaseline,
  type EditorForm,
} from "@/app/admin/(admin)/collections/[collectionId]/picker";
import type { CatalogEntry } from "@/app/admin/(admin)/collections/types";

function entry(overrides: Partial<CatalogEntry> & { shoeId: string }): CatalogEntry {
  return {
    modelId: "m1",
    modelName: "Air Force 1",
    color: "white",
    primaryImageUrl: null,
    isLive: true,
    ...overrides,
  };
}

describe("buildGroups", () => {
  it("groups colours under their model, models by name and colours within a model", () => {
    const catalog = [
      entry({ shoeId: "b-red", modelId: "m2", modelName: "Blazer", color: "red" }),
      entry({ shoeId: "a-white", modelId: "m1", modelName: "Air Force 1", color: "white" }),
      entry({ shoeId: "b-blue", modelId: "m2", modelName: "Blazer", color: "blue" }),
      entry({ shoeId: "a-black", modelId: "m1", modelName: "Air Force 1", color: "black" }),
    ];

    const groups = buildGroups(catalog, { query: "", hideOffline: false });

    expect(groups.map((g) => g.modelName)).toEqual(["Air Force 1", "Blazer"]);
    expect(groups[0].colours.map((c) => c.shoeId)).toEqual(["a-black", "a-white"]);
    expect(groups[1].colours.map((c) => c.shoeId)).toEqual(["b-blue", "b-red"]);
  });
});

describe("buildGroups filtering", () => {
  const catalog = [
    entry({ shoeId: "af-white", color: "white" }),
    entry({ shoeId: "af-black", color: "black", isLive: false }),
    entry({ shoeId: "bl-white", modelId: "m2", modelName: "Blazer", color: "white" }),
    entry({ shoeId: "sd-crème", modelId: "m3", modelName: "Sandale", color: "crème" }),
  ];

  it("matches every search token across model and colour, ignoring case and accents", () => {
    const groups = buildGroups(catalog, { query: "AIR whi", hideOffline: false });

    expect(groups).toHaveLength(1);
    expect(groups[0].colours.map((c) => c.shoeId)).toEqual(["af-white"]);
  });

  it("ignores accents on both sides of the match", () => {
    const groups = buildGroups(catalog, { query: "creme", hideOffline: false });

    expect(groups.map((g) => g.modelName)).toEqual(["Sandale"]);
  });

  it("drops offline colours when hideOffline is on, and groups left empty with them", () => {
    const offlineOnly = [entry({ shoeId: "x", modelId: "m9", modelName: "Zoom", isLive: false })];
    const groups = buildGroups([...catalog, ...offlineOnly], {
      query: "",
      hideOffline: true,
    });

    expect(groups.map((g) => g.modelName)).toEqual(["Air Force 1", "Blazer", "Sandale"]);
    expect(groups[0].colours.map((c) => c.shoeId)).toEqual(["af-white"]);
  });

  it("keeps offline colours when hideOffline is off", () => {
    const groups = buildGroups(catalog, { query: "", hideOffline: false });

    expect(groups[0].colours.map((c) => c.shoeId)).toEqual(["af-black", "af-white"]);
  });
});

describe("groupSelection", () => {
  const group = buildGroups(
    [
      entry({ shoeId: "af-white", color: "white" }),
      entry({ shoeId: "af-black", color: "black" }),
    ],
    { query: "", hideOffline: false },
  )[0];

  it("is none when no displayed colour is picked", () => {
    expect(groupSelection(group, new Set())).toBe("none");
  });

  it("is some when only part of the displayed colours are picked", () => {
    expect(groupSelection(group, new Set(["af-white"]))).toBe("some");
  });

  it("is all when every displayed colour is picked", () => {
    expect(groupSelection(group, new Set(["af-white", "af-black"]))).toBe("all");
  });

  // Decision #4: the box acts on what is on screen, so a group narrowed to one
  // matching colour reads "all" once that colour is picked, even though the
  // model has others that the filter hid.
  it("reads only the displayed colours, not the model's full colour set", () => {
    const narrowed = buildGroups(
      [
        entry({ shoeId: "af-white", color: "white" }),
        entry({ shoeId: "af-black", color: "black" }),
      ],
      { query: "white", hideOffline: false },
    )[0];

    expect(groupSelection(narrowed, new Set(["af-white"]))).toBe("all");
  });
});

describe("toggleGroup", () => {
  const catalog = [
    entry({ shoeId: "af-white", color: "white" }),
    entry({ shoeId: "af-black", color: "black" }),
    entry({ shoeId: "af-red", color: "red", isLive: false }),
  ];
  const group = buildGroups(catalog, { query: "", hideOffline: false })[0];

  it("appends every displayed colour at the end in display order", () => {
    const existing = [entry({ shoeId: "bl-blue", modelId: "m2", modelName: "Blazer" })];

    const next = toggleGroup(existing, group, new Set(["bl-blue"]));

    expect(next.map((i) => i.shoeId)).toEqual(["bl-blue", "af-black", "af-red", "af-white"]);
  });

  it("appends only the colours not already picked, leaving the picked ones in place", () => {
    const existing = [catalog[0], entry({ shoeId: "bl-blue", modelId: "m2" })];

    const next = toggleGroup(existing, group, new Set(["af-white", "bl-blue"]));

    expect(next.map((i) => i.shoeId)).toEqual(["af-white", "bl-blue", "af-black", "af-red"]);
  });

  it("removes every displayed colour when they are all already picked", () => {
    const existing = [...catalog, entry({ shoeId: "bl-blue", modelId: "m2" })];

    const next = toggleGroup(existing, group, new Set(catalog.map((c) => c.shoeId)));

    expect(next.map((i) => i.shoeId)).toEqual(["bl-blue"]);
  });

  // The click must do exactly what the row's count says, so a filtered-out
  // colour is neither added nor removed by the group box.
  it("leaves colours hidden by the filter untouched on both add and remove", () => {
    const online = buildGroups(catalog, { query: "", hideOffline: true })[0];

    expect(toggleGroup([], online, new Set()).map((i) => i.shoeId)).toEqual([
      "af-black",
      "af-white",
    ]);
    expect(
      toggleGroup(catalog, online, new Set(["af-white", "af-black"])).map((i) => i.shoeId),
    ).toEqual(["af-red"]);
  });
});

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"].map((shoeId) => entry({ shoeId }));
  const ids = (list: CatalogEntry[]) => list.map((i) => i.shoeId);

  it("swaps with the neighbour above", () => {
    expect(ids(moveItem(items, "c", "up"))).toEqual(["a", "c", "b", "d"]);
  });

  it("swaps with the neighbour below", () => {
    expect(ids(moveItem(items, "b", "down"))).toEqual(["a", "c", "b", "d"]);
  });

  it("lifts to the front, keeping everything else in order", () => {
    expect(ids(moveItem(items, "d", "top"))).toEqual(["d", "a", "b", "c"]);
  });

  it("drops to the end, keeping everything else in order", () => {
    expect(ids(moveItem(items, "a", "bottom"))).toEqual(["b", "c", "d", "a"]);
  });

  it("is a no-op at the ends and for an id it does not hold", () => {
    expect(ids(moveItem(items, "a", "up"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(moveItem(items, "d", "down"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(moveItem(items, "a", "top"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(moveItem(items, "d", "bottom"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(moveItem(items, "zz", "up"))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("fieldsDirty", () => {
  const baseline: EditorBaseline = {
    title: "Ja Morant",
    subtitle: null,
    imageAlt: null,
    slug: "ja-morant",
    shoeIds: [],
  };
  const form: EditorForm = { title: "Ja Morant", subtitle: "", imageAlt: "", slug: "ja-morant" };

  it("is clean for the untouched form the baseline was built from", () => {
    expect(fieldsDirty(form, baseline, false)).toBe(false);
  });

  it("ignores whitespace the save body would trim off anyway", () => {
    expect(fieldsDirty({ ...form, title: "  Ja Morant  " }, baseline, false)).toBe(false);
  });

  // The save body sends `trim() || null`, so a blank optional field and a null
  // one are the same value and must not read as a change.
  it("treats a blank optional field as the null the baseline holds", () => {
    expect(fieldsDirty({ ...form, subtitle: "   " }, baseline, false)).toBe(false);
    expect(fieldsDirty({ ...form, imageAlt: "" }, baseline, false)).toBe(false);
  });

  it("catches an edit to any of the three text fields", () => {
    expect(fieldsDirty({ ...form, title: "KD" }, baseline, false)).toBe(true);
    expect(fieldsDirty({ ...form, subtitle: "Memphis" }, baseline, false)).toBe(true);
    expect(fieldsDirty({ ...form, imageAlt: "Ja dunking" }, baseline, false)).toBe(true);
  });

  it("catches clearing an optional field that had a value", () => {
    expect(fieldsDirty(form, { ...baseline, subtitle: "Memphis" }, false)).toBe(true);
  });

  // The slug only travels when it was deliberately unlocked, so a locked slug
  // cannot be dirty however it got edited.
  it("only counts the slug once it has been unlocked", () => {
    const renamed = { ...form, slug: "ja-morant-2" };

    expect(fieldsDirty(renamed, baseline, false)).toBe(false);
    expect(fieldsDirty(renamed, baseline, true)).toBe(true);
    expect(fieldsDirty(form, baseline, true)).toBe(false);
  });
});

describe("itemsDirty", () => {
  const picks = ["a", "b", "c"].map((shoeId) => entry({ shoeId }));

  it("is clean for the same picks in the same order", () => {
    expect(itemsDirty(picks, ["a", "b", "c"])).toBe(false);
  });

  it("catches an addition and a removal", () => {
    expect(itemsDirty(picks, ["a", "b"])).toBe(true);
    expect(itemsDirty(picks, ["a", "b", "c", "d"])).toBe(true);
  });

  // A reorder is a change: sortOrder is what the storefront renders by.
  it("catches a reorder of the same picks", () => {
    expect(itemsDirty(picks, ["c", "b", "a"])).toBe(true);
  });
});

describe("storefrontStatus", () => {
  const live = [entry({ shoeId: "a", isLive: true })];
  const offline = [entry({ shoeId: "a", isLive: false })];
  const saved = { imageUrl: "https://cdn/x.jpg", isVisible: true };

  it("is live when it has an image, is switched on and holds a live pick", () => {
    expect(storefrontStatus({ ...saved, items: live })).toBe("live");
  });

  // ADR-0006's three not-showing states, in precedence order: the missing image
  // is reported first because the card *is* the image.
  it("reports Incomplete ahead of Hidden and Empty", () => {
    expect(storefrontStatus({ imageUrl: null, isVisible: false, items: offline })).toBe(
      "incomplete",
    );
  });

  it("reports Hidden ahead of Empty", () => {
    expect(storefrontStatus({ ...saved, isVisible: false, items: offline })).toBe("hidden");
  });

  it("reports Empty when every pick is offline", () => {
    expect(storefrontStatus({ ...saved, items: offline })).toBe("empty");
  });

  it("reports Empty when there are no picks at all", () => {
    expect(storefrontStatus({ ...saved, items: [] })).toBe("empty");
  });

  // Reads current local picks, not saved ones, so the banner reacts as you tick
  // rather than lying until the save lands.
  it("leaves Empty as soon as one live pick is in the local list", () => {
    expect(storefrontStatus({ ...saved, items: [...offline, ...live] })).toBe("live");
  });
});
