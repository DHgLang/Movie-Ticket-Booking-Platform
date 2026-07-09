import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function copyIfMissing(srcName, destName) {
  const src = path.join(root, srcName);
  const dest = path.join(root, destName);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`Created ${destName} from ${srcName}`);
    return true;
  }
  return false;
}

const createdEnv = copyIfMissing(".env.example", ".env");
const createdOutputs = copyIfMissing("amplify_outputs.example.json", "amplify_outputs.json");

if (createdEnv) {
  console.log("→ Sửa .env: điền VITE_TMDB_API_KEY và TMDB_API_KEY (lấy tại https://www.themoviedb.org/settings/api)");
}

if (!createdEnv && !createdOutputs) {
  console.log("Setup OK — .env và amplify_outputs.json đã có sẵn.");
} else if (!createdEnv) {
  console.log("Setup OK — chỉ cần sửa .env nếu chưa có TMDB key.");
}
