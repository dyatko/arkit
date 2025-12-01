import { ConfigBase, OutputFormat, SavedString } from "./types";
import * as path from "path";
import * as fs from "fs";
import { debug, warn, info } from "./logger";

export type ConverterBackend = "wasm" | "java";

export class Converter {
  private readonly config: ConfigBase;
  private backend: ConverterBackend | null = null;
  private graphviz: any = null;

  constructor(config: ConfigBase) {
    this.config = config;
  }

  // Initialize the appropriate backend
  private async initializeBackend(): Promise<ConverterBackend> {
    if (this.backend) {
      return this.backend;
    }

    // Try WASM first (default - eliminates GraphViz system dependency)
    // Note: Java is still required for PlantUML, but GraphViz is not
    try {
      const { Graphviz } = await import("@hpcc-js/wasm-graphviz");
      this.graphviz = await Graphviz.load();

      // Verify Java is available for PlantUML
      await import("node-plantuml");

      this.backend = "wasm";
      info(
        "Using Java PlantUML + @hpcc-js/wasm-graphviz (no GraphViz system dependency)",
      );
      return "wasm";
    } catch (wasmError: any) {
      warn(
        `@hpcc-js/wasm-graphviz not available: ${wasmError.message}, falling back to system GraphViz`,
      );

      // Fall back to system GraphViz
      try {
        await import("node-plantuml");
        this.backend = "java";
        info(
          "Using Java PlantUML + system GraphViz (requires Java + GraphViz installed)",
        );
        return "java";
      } catch (javaError: any) {
        throw new Error(
          `No diagram renderer available.\n` +
            `@hpcc-js/wasm error: ${wasmError.message}\n` +
            `Java/PlantUML error: ${javaError.message}\n\n` +
            `Please install Java Runtime Environment (JRE) 8+:\n` +
            `  - Windows: https://adoptium.net/\n` +
            `  - macOS: brew install openjdk\n` +
            `  - Linux: sudo apt-get install default-jre\n\n` +
            `Then either:\n` +
            `  1. npm install @hpcc-js/wasm-graphviz (recommended, no GraphViz needed)\n` +
            `  2. Install GraphViz: https://graphviz.org/download/`,
        );
      }
    }
  }

  async convert(pathOrType: string, puml: string): Promise<SavedString> {
    const fullExportPath = path.resolve(this.config.directory, pathOrType);
    const ext = path.extname(fullExportPath);
    const shouldConvertAndSave = Object.values<any>(OutputFormat).includes(
      ext.replace(".", ""),
    );
    const shouldConvertAndOutput =
      Object.values<any>(OutputFormat).includes(pathOrType);

    if (fs.existsSync(fullExportPath)) {
      debug("Removing", fullExportPath);
      fs.unlinkSync(fullExportPath);
    }

    if (shouldConvertAndSave || shouldConvertAndOutput) {
      debug("Converting", ext ? fullExportPath : pathOrType);

      // Initialize backend on first conversion
      await this.initializeBackend();

      return this.convertToImage(puml, ext || pathOrType)
        .then((image) => {
          if (shouldConvertAndSave) {
            debug("Saving", fullExportPath, image.length);
            return this.save(fullExportPath, image);
          }

          return image.toString();
        })
        .catch((err) => {
          throw err;
        });
    } else {
      if (ext === ".puml") {
        debug("Saving", fullExportPath);
        return this.save(fullExportPath, puml);
      }

      return Promise.resolve(puml);
    }
  }

  private save(path: string, data: Buffer | string): Promise<SavedString> {
    const str = new SavedString(data.toString());

    str.path = path;
    fs.writeFileSync(path, data);

    return Promise.resolve(str);
  }

  requestChain: Promise<any> = Promise.resolve();

  async convertToImage(puml: string, format: string): Promise<Buffer> {
    const formatMatch = format.match(/\w{3}/);

    if (!formatMatch) {
      throw new Error(`Cannot identify image format from ${format}`);
    }

    const outputFormat = formatMatch[0];

    // Validate format is supported
    if (outputFormat !== "svg" && outputFormat !== "png") {
      throw new Error(
        `Unsupported format: ${outputFormat}. Only svg and png are supported.`,
      );
    }

    if (!this.backend) {
      throw new Error("Backend not initialized");
    }

    if (this.backend === "wasm") {
      return this.convertWithWasm(puml, outputFormat);
    } else {
      return this.convertWithSystemGraphviz(puml, outputFormat);
    }
  }

  private async convertWithWasm(puml: string, format: string): Promise<Buffer> {
    debug(
      `Converting PlantUML to ${format} using Java PlantUML + @hpcc-js/wasm GraphViz`,
    );

    try {
      const plantuml = await import("node-plantuml");

      // Use PlantUML to generate the requested format (svg or png)
      const output = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const errorChunks: Buffer[] = [];
        const gen = plantuml.generate(puml, {
          format: format as "svg" | "png",
        });

        gen.out.on("data", (chunk: Buffer) => chunks.push(chunk));
        gen.out.on("end", () => {
          let result = Buffer.concat(chunks);
          
          // If SVG, check for multiple XML declarations (PlantUML error output)
          // and keep only the first complete SVG document
          if (format === "svg") {
            const svgString = result.toString();
            const firstSvgEnd = svgString.indexOf("</svg>");
            if (firstSvgEnd !== -1) {
              const secondXmlStart = svgString.indexOf(
                '<?xml version="1.0"',
                firstSvgEnd,
              );
              if (secondXmlStart !== -1) {
                // Multiple SVG documents found, keep only the first one
                result = Buffer.from(svgString.substring(0, firstSvgEnd + 6));
                debug(
                  `Filtered duplicate PlantUML output (error SVG), kept first ${result.length} bytes`,
                );
              }
            }
          }
          
          resolve(result);
        });
        gen.out.on("error", reject);
      });

      debug(
        `Successfully generated ${format} using WASM backend, size: ${output.length} bytes`,
      );

      return output;
    } catch (error: any) {
      warn(`WASM conversion error: ${error.message}`);
      throw new Error(`WASM conversion failed: ${error.message}`);
    }
  }

  private convertWithSystemGraphviz(
    puml: string,
    format: string,
  ): Promise<Buffer> {
    debug(
      `Converting PlantUML to ${format} using Java PlantUML + system GraphViz`,
    );

    return new Promise((resolve, reject) => {
      // Chain requests to avoid concurrent PlantUML execution issues
      this.requestChain = this.requestChain.then(async () => {
        return new Promise<Buffer>((resolveChain, rejectChain) => {
          const plantuml = require("node-plantuml");
          const chunks: Buffer[] = [];
          const gen = plantuml.generate(puml, { format });

          gen.out.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          gen.out.on("end", () => {
            const result = Buffer.concat(chunks);
            debug(
              `Successfully generated ${format} using system GraphViz, size: ${result.length} bytes`,
            );
            resolveChain(result);
            resolve(result);
          });

          gen.out.on("error", (err: Error) => {
            warn(`System GraphViz conversion error: ${err.message}`);
            const errorMsg = this.getSystemDependencyErrorMessage(err);
            rejectChain(new Error(errorMsg));
            reject(new Error(errorMsg));
          });
        });
      });
    });
  }

  private getSystemDependencyErrorMessage(err: Error): string {
    const errMsg = err.message || "";

    if (errMsg.includes("ENOENT") || errMsg.includes("java")) {
      return (
        `PlantUML conversion failed: Java is not installed or not in PATH.\n` +
        `Please install Java Runtime Environment (JRE) 8 or higher:\n` +
        `  - Windows: Download from https://adoptium.net/\n` +
        `  - macOS: brew install openjdk\n` +
        `  - Linux: sudo apt-get install default-jre\n\n` +
        `Install @hpcc-js/wasm-graphviz to eliminate GraphViz system dependency:\n` +
        `  npm install @hpcc-js/wasm-graphviz\n\n` +
        `Or install GraphViz:\n` +
        `  - Windows: Download from https://graphviz.org/download/\n` +
        `  - macOS: brew install graphviz\n` +
        `  - Linux: sudo apt-get install graphviz\n\n` +
        `Original error: ${errMsg}`
      );
    }

    if (errMsg.includes("dot") || errMsg.includes("graphviz")) {
      return (
        `GraphViz not found. Please either:\n` +
        `  1. npm install @hpcc-js/wasm-graphviz (recommended, no system dependency)\n` +
        `  2. Install GraphViz system-wide:\n` +
        `     - Windows: https://graphviz.org/download/\n` +
        `     - macOS: brew install graphviz\n` +
        `     - Linux: sudo apt-get install graphviz\n\n` +
        `Original error: ${errMsg}`
      );
    }

    return `PlantUML conversion failed: ${errMsg}`;
  }
}
