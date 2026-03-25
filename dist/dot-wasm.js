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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => __awaiter(this, void 0, void 0, function* () {
    try {
        // Use Function-wrapped import() to prevent TypeScript from compiling it to require().
        // @hpcc-js/wasm-graphviz is ESM-only and require() fails on Node < 22.
        const dynamicImport = new Function("specifier", "return import(specifier)");
        const { Graphviz } = yield dynamicImport("@hpcc-js/wasm-graphviz");
        const graphviz = yield Graphviz.load();
        const result = graphviz.dot(input, format);
        process.stdout.write(result);
    }
    catch (err) {
        process.stderr.write(`dot-wasm error: ${err.message}\n`);
        process.exit(1);
    }
}));
