import esbuild from "esbuild";

let result = esbuild.buildSync({
  entryPoints: ["src/client.ts", "src/host/host.ts"],
  bundle: true,
  color: true,
  minify: true,
  metafile: true,
  outdir: "public/out/",
});

let text = esbuild.analyzeMetafileSync(result.metafile);
console.log(text);
