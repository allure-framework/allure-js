import { join, basename } from "node:path";
import esbuild from "esbuild";
import { glob } from "glob";

;(async () => {
  const nodeFiles = await glob([join(__dirname, "src/reporter.ts")]);
  const browserFiles = await glob([join(__dirname, "src/index.ts"), join(__dirname, "src/commands.ts")]);

  for (const file of nodeFiles) {
    await esbuild.build({
      bundle: true,
      format: "cjs",
      platform: "node",
      sourcemap: true,
      entryPoints: [file],
      outfile: join(__dirname, "dist", basename(file).replace(/\.ts$/, ".cjs")),
    });
    await esbuild.build({
      bundle: true,
      format: "esm",
      platform: "node",
      sourcemap: true,
      entryPoints: [file],
      outfile: join(__dirname, "dist", basename(file).replace(/\.ts$/, ".js")),
    });
  }

  for (const file of browserFiles) {
    await esbuild.build({
      bundle: true,
      format: "cjs",
      platform: "browser",
      sourcemap: true,
      entryPoints: [file],
      outfile: join(__dirname, "dist", basename(file).replace(/\.ts$/, ".cjs")),
    });
    await esbuild.build({
      bundle: true,
      format: "cjs",
      platform: "browser",
      sourcemap: true,
      entryPoints: [file],
      outfile: join(__dirname, "dist", basename(file).replace(/\.ts$/, ".js")),
    });
  }
})();
