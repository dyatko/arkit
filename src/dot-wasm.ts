#!/usr/bin/env node

/**
 * WASM GraphViz dot wrapper
 *
 * Acts as a drop-in replacement for the `dot` binary from GraphViz.
 * PlantUML calls this via `-graphvizdot` to lay out diagrams without
 * requiring a system GraphViz installation.
 *
 * Supports:
 *   -V           Print version to stderr
 *   -T<format>   Output format (svg, png, etc.)
 *   stdin        DOT source input
 *   stdout       Rendered output
 */

const args = process.argv.slice(2);

// Handle -V (version check)
if (args.includes("-V")) {
  process.stderr.write("dot - graphviz version 12.2.1 (wasm-graphviz)\n");
  process.exit(0);
}

// Parse output format from -T flag
let format = "svg";
for (const arg of args) {
  const match = arg.match(/^-T(\w+)/);
  if (match) {
    format = match[1];
  }
}

// Read DOT source from stdin and render
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => (input += chunk));
process.stdin.on("end", async () => {
  try {
    // Use Function-wrapped import() to prevent TypeScript from compiling it to require().
    // @hpcc-js/wasm-graphviz is ESM-only and require() fails on Node < 22.
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<any>;
    const { Graphviz } = await dynamicImport("@hpcc-js/wasm-graphviz");
    const graphviz = await Graphviz.load();
    const result = graphviz.dot(input, format);
    process.stdout.write(result);
  } catch (err: any) {
    process.stderr.write(`dot-wasm error: ${err.message}\n`);
    process.exit(1);
  }
});
