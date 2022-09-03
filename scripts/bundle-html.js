import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";
import path from "path";

export function bundleHtml(outDir, componentDir, sourceFiles) {
  // const outDir = "out";
  // const sourceFiles = ["src/index.html", "src/host.html"];
  // const componentDir = "src/components";

  const destFiles = sourceFiles.map((file) => {
    const parts = file.split(path.sep);
    parts[0] = outDir;
    return parts.join(path.sep);
  });

  const templateFiles = readdirSync(componentDir, { withFileTypes: true })
    .filter((de) => de.isDirectory())
    .flatMap((de) =>
      readdirSync(resolve(componentDir, de.name))
        .filter((fname) => fname.endsWith(".html"))
        .map((fname) => resolve(componentDir, de.name, fname))
    );

  const templatesData = templateFiles
    .map((f) => readFileSync(f, { encoding: "utf-8" }))
    .join("\n");

  sourceFiles.forEach((f, i) => {
    const outFile = destFiles[i];
    let data = readFileSync(f, { encoding: "utf-8" });
    data = data.replace("<!--HTML_TEMPLATES-->", templatesData);
    console.log(outFile);
    writeFileSync(outFile, data);
  });
}
