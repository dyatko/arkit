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
declare const args: string[];
declare let format: string;
declare let input: string;
//# sourceMappingURL=dot-wasm.d.ts.map