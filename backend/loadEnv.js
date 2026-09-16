/**
 * Load local env files before any other backend module reads process.env.
 *
 * This must be imported first from server.js. ESM evaluates all `import`
 * statements before the rest of the module, so calling dotenv.config() in
 * server.js after other imports does not populate env vars in time.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });
