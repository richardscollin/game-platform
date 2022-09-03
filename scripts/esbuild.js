import esbuild from "esbuild";
import {bundleHtml} from "./bundle-html.js";

bundleHtml("out", "src/components", ["src/index.html", "src/host.html"]);


let result = esbuild.buildSync({
  entryPoints: ["src/client.ts", "src/host/host.ts"],
  bundle: true,
  color: true,
  minify: true,
  metafile: true,
  outdir: "out",
});

let text = esbuild.analyzeMetafileSync(result.metafile);
console.log(text);
