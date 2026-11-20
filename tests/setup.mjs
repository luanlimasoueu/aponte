// Lets node:test import the TypeScript sources directly (extensionless imports and the "@/" alias).
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

registerHooks({
  resolve(specifier, context, next) {
    let spec = specifier;
    if (spec.startsWith("@/")) spec = pathToFileURL(path.join(src, spec.slice(2))).href;
    if ((spec.startsWith(".") || spec.startsWith("file:")) && !path.extname(spec)) {
      const base = spec.startsWith("file:") ? fileURLToPath(spec) : fileURLToPath(new URL(spec, context.parentURL));
      for (const ext of [".ts", ".tsx"]) {
        if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
      }
    }
    return next(spec, context);
  },
});
