import { beforeEach, describe, expect, it } from "vitest";
import {
  dhdCommunes,
  dhdTarifs,
  dhdWilayas,
  yalidineCommunes,
  yalidineWilayas,
} from "@/lib/schema";
import { getCoverage } from "@/lib/delivery/coverageData";
import { isDeliverable } from "@/lib/delivery/coverage";
import { createTestDb, type TestDb } from "../testDb";
import type { Executor } from "@/lib/db";

let db: TestDb;

const exec = () => db as unknown as Executor;

beforeEach(async () => {
  db = await createTestDb();
});

async function seedDhdWilaya(
  wilayaId: number,
  tarif: { livraison: string; stopdesk: string },
  communes: Array<{ nom: string; hasStopDesk: number }>,
) {
  await db.insert(dhdWilayas).values({ wilayaId, name: `W${wilayaId}` });
  await db.insert(dhdTarifs).values({
    wilayaId,
    tarifLivraison: tarif.livraison,
    tarifStopdeskLivraison: tarif.stopdesk,
  });
  await db
    .insert(dhdCommunes)
    .values(communes.map((c) => ({ wilayaId, nom: c.nom, hasStopDesk: c.hasStopDesk })));
}

describe("getCoverage — DHD", () => {
  it("offers home delivery everywhere and desk only where a desk exists", async () => {
    await seedDhdWilaya(16, { livraison: "500", stopdesk: "300" }, [
      { nom: "Alger Centre", hasStopDesk: 1 },
      { nom: "Bab Ezzouar", hasStopDesk: 0 },
    ]);

    const coverage = await getCoverage("dhd", 16, exec());
    const byName = Object.fromEntries(coverage.map((c) => [c.name, c]));

    expect(byName["Alger Centre"].modes).toEqual({
      home: { available: true, fee: 500 },
      desk: { available: true, fee: 300 },
    });
    expect(byName["Bab Ezzouar"].modes.home.available).toBe(true);
    expect(byName["Bab Ezzouar"].modes.desk.available).toBe(false);
  });

  // Beni Abbes (52) and El M'Ghair (57) carry tarif_stopdesk_livraison = "0",
  // and are exactly the two wilayas whose communes all have has_stop_desk = 0.
  // A zero desk tarif means "no desk service here", never "free desk".
  it("treats a zero desk tarif as unavailable, not free", async () => {
    await seedDhdWilaya(52, { livraison: "1300", stopdesk: "0" }, [
      { nom: "Beni Abbes", hasStopDesk: 0 },
      // Belt and braces: even if a row claimed a desk, a 0 tarif vetoes it.
      { nom: "Tamtert", hasStopDesk: 1 },
    ]);

    const coverage = await getCoverage("dhd", 52, exec());

    expect(coverage.every((c) => c.modes.desk.available === false)).toBe(true);
    expect(coverage.every((c) => c.modes.home.available === true)).toBe(true);
    // Still deliverable — the whole wilaya must stay offerable, home-only.
    expect(coverage.every(isDeliverable)).toBe(true);
  });

  it("coerces varchar tarifs to integer DZD", async () => {
    await seedDhdWilaya(31, { livraison: "700", stopdesk: "450" }, [
      { nom: "Oran", hasStopDesk: 1 },
    ]);

    const [oran] = await getCoverage("dhd", 31, exec());
    expect(oran.modes.home.fee).toBe(700);
    expect(oran.modes.desk.fee).toBe(450);
    expect(typeof oran.modes.home.fee).toBe("number");
  });
});

describe("getCoverage — Yalidine", () => {
  beforeEach(async () => {
    await db.insert(yalidineWilayas).values({ wilayaId: 16, name: "Alger" });
    await db.insert(yalidineCommunes).values([
      {
        communeId: 101,
        wilayaId: 16,
        name: "Alger Centre",
        wilayaName: "Alger",
        hasStopDesk: 1,
        isDeliverable: 1,
        expressDesk: 400,
        stopdeskId: 9001,
      },
      {
        communeId: 102,
        wilayaId: 16,
        name: "Rouiba",
        wilayaName: "Alger",
        hasStopDesk: 0,
        isDeliverable: 1,
        expressDesk: 400,
        stopdeskId: null,
      },
      {
        communeId: 103,
        wilayaId: 16,
        name: "Nowhere",
        wilayaName: "Alger",
        hasStopDesk: 0,
        isDeliverable: 0,
        expressDesk: 400,
        stopdeskId: null,
      },
    ]);
  });

  it("carries the stopdesk center id needed for parcel creation", async () => {
    const coverage = await getCoverage("yalidine", 16, exec());
    const alger = coverage.find((c) => c.name === "Alger Centre")!;

    expect(alger.modes.desk.available).toBe(true);
    expect(alger.modes.desk.deskId).toBe(9001);
    expect(alger.modes.home.fee).toBe(400);
  });

  it("marks is_deliverable = 0 communes as serving no mode at all", async () => {
    const coverage = await getCoverage("yalidine", 16, exec());
    const nowhere = coverage.find((c) => c.name === "Nowhere")!;

    expect(nowhere.modes.home.available).toBe(false);
    expect(nowhere.modes.desk.available).toBe(false);
    // This is what keeps such a commune out of an "any-mode" dropdown.
    expect(isDeliverable(nowhere)).toBe(false);
    expect(coverage.filter(isDeliverable).map((c) => c.name).sort()).toEqual([
      "Alger Centre",
      "Rouiba",
    ]);
  });
});
