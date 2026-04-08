import fs from "fs";
import path from "path";

interface CommuneRecord {
  nom: string;
  has_stop_desk: number;
  wilaya_id?: number;
}

type CommuneMap = Record<number, Record<string, number>>;

function readJsonFile(filePath: string): unknown {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, "utf-8"));
}

function normalizeCommunes(data: unknown): CommuneMap {
  if (Array.isArray(data)) {
    return data.reduce((acc, item) => {
      const commune = item as CommuneRecord;
      if (typeof commune.wilaya_id !== "number" || typeof commune.nom !== "string") {
        return acc;
      }
      const wilayaId = commune.wilaya_id;
      acc[wilayaId] ??= {};
      acc[wilayaId][commune.nom] = commune.has_stop_desk;
      return acc;
    }, {} as CommuneMap);
  }

  if (data && typeof data === "object") {
    return Object.entries(data).reduce((acc, [key, value]) => {
      const wilayaId = Number(key);
      if (Number.isNaN(wilayaId) || !Array.isArray(value)) {
        return acc;
      }
      acc[wilayaId] = (value as CommuneRecord[]).reduce((communes, commune) => {
        if (typeof commune.nom !== "string") {
          return communes;
        }
        communes[commune.nom] = commune.has_stop_desk;
        return communes;
      }, {} as Record<string, number>);
      return acc;
    }, {} as CommuneMap);
  }

  throw new Error("Unsupported communes JSON structure.");
}

function compareHasStopDeskDifferences(originalPath = "communes.json", testedPath = "tested.json") {
  const originalData = readJsonFile(originalPath);
  const testedData = readJsonFile(testedPath);

  const originalMap = normalizeCommunes(originalData);
  const testedMap = normalizeCommunes(testedData);

  const differences: Array<{ wilaya_id: number; nom: string; original: number; tested: number }> = [];

  const allWilayas = new Set<number>([
    ...Object.keys(originalMap).map(Number),
    ...Object.keys(testedMap).map(Number),
  ]);

  for (const wilayaId of allWilayas) {
    const originalCommunes = originalMap[wilayaId] ?? {};
    const testedCommunes = testedMap[wilayaId] ?? {};
    const communeNames = new Set<string>([
      ...Object.keys(originalCommunes),
      ...Object.keys(testedCommunes),
    ]);

    for (const name of communeNames) {
      const originalValue = originalCommunes[name];
      const testedValue = testedCommunes[name];

      if (originalValue !== testedValue) {
        differences.push({
          wilaya_id: wilayaId,
          nom: name,
          original: originalValue,
          tested: testedValue,
        });
      }
    }
  }

  if (differences.length === 0) {
    console.log("No has_stop_desk differences found between the two files.");
    return;
  }

  console.log(`Found ${differences.length} communes with different has_stop_desk values:`);
  for (const difference of differences) {
    console.log(
      `wilaya ${difference.wilaya_id} - ${difference.nom}: original=${difference.original} tested=${difference.tested}`
    );
  }
}

compareHasStopDeskDifferences();
