import fs from "fs";
import path from "path";

interface CommuneWithWilaya {
  id: number;
  name: string;
  wilaya_id: number;
  wilaya_name: string;
  has_stop_desk: number;
  is_deliverable: number;
  delivery_time_parcel: number;
  delivery_time_payment: number;
}

interface CommuneWithoutWilaya {
  name: string;
  id: number;
  wilaya_name: string;
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
      const { id, name, wilaya_id, wilaya_name, has_stop_desk } = commune;
      if (!acc[wilaya_id]) {
        acc[wilaya_id] = [];
      }
      const t: CommuneWithoutWilaya = { id, name, wilaya_name, has_stop_desk };
      acc[wilaya_id].push(t);
      return acc;
    }, {} as GroupedCommunes);
  }

  //   if (parsed && typeof parsed === "object") {
  //     return Object.entries(parsed).reduce((acc, [key, value]) => {
  //       const wilaya_id = Number(key);
  //       if (!Array.isArray(value)) {
  //         throw new Error(`Invalid data format for wilaya ${key}`);
  //       }

  //       acc[wilaya_id] = value.map((commune: CommuneWithoutWilaya) => ({
  //         name: commune.name,
  //         has_stop_desk: commune.has_stop_desk,
  //       }));

  //       return acc;
  //     }, {} as GroupedCommunes);
  //   }

  throw new Error("Unsupported JSON structure for communes data.");
}

/** Resolve input path: cwd first (when run from repo root), then next to this script. */
function resolveInputPath(userPath: string): string {
  if (path.isAbsolute(userPath)) {
    return userPath;
  }
  const fromCwd = path.resolve(process.cwd(), userPath);
  const fromScript = path.resolve(__dirname, userPath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  if (fs.existsSync(fromScript)) {
    return fromScript;
  }
  throw new Error(
    `Input file not found. Tried:\n  - ${fromCwd}\n  - ${fromScript}`,
  );
}

const inputFile = process.argv[2] || "tst.json";
const outputFile = process.argv[3] || "tested.json";
const resolvedFile = resolveInputPath(inputFile);
const resolvedOutputFile = path.isAbsolute(outputFile)
  ? outputFile
  : path.resolve(process.cwd(), outputFile);

const result = convertCommunes(resolvedFile);
fs.writeFileSync(resolvedOutputFile, JSON.stringify(result, null, 2), "utf-8");
console.log(`Written converted data to ${resolvedOutputFile}`);

// From repo root: npx tsx lib/Yalidin/convertCommunes_yalidin.ts yalidinOutputcommunes.json [out.json]
