import fs from "fs";
import path from "path";

interface CommuneWithWilaya {
  nom: string;
  wilaya_id: number;
  code_postal: string;
  has_stop_desk: number;
}

interface CommuneWithoutWilaya {
  nom: string;
  has_stop_desk: number;
}

interface GroupedCommunes {
  [wilaya_id: number]: CommuneWithoutWilaya[];
}

function convertCommunes(filePath: string): GroupedCommunes {
  const data = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(data);

  if (Array.isArray(parsed)) {
    return parsed.reduce((acc, commune: CommuneWithWilaya) => {
      const { code_postal, wilaya_id, ...rest } = commune;
      if (!acc[wilaya_id]) {
        acc[wilaya_id] = [];
      }
      acc[wilaya_id].push(rest);
      return acc;
    }, {} as GroupedCommunes);
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).reduce((acc, [key, value]) => {
      const wilaya_id = Number(key);
      if (!Array.isArray(value)) {
        throw new Error(`Invalid data format for wilaya ${key}`);
      }

      acc[wilaya_id] = value.map((commune: CommuneWithoutWilaya) => ({
        nom: commune.nom,
        has_stop_desk: commune.has_stop_desk,
      }));

      return acc;
    }, {} as GroupedCommunes);
  }

  throw new Error("Unsupported JSON structure for communes data.");
}

const inputFile = process.argv[2] || "tst.json";
const outputFile = process.argv[3] || "tested.json";
const resolvedFile = path.resolve(process.cwd(), inputFile);
const resolvedOutputFile = path.resolve(process.cwd(), outputFile);

if (!fs.existsSync(resolvedFile)) {
  throw new Error(`Input file not found: ${resolvedFile}`);
}

const result = convertCommunes(resolvedFile);
fs.writeFileSync(resolvedOutputFile, JSON.stringify(result, null, 2), "utf-8");
console.log(`Written converted data to ${resolvedOutputFile}`);


// use this command to run the script : npx tsx lib/dhdHelpers/convertCommunes.ts dhdOutputcommunes.json


