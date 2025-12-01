import { ConfigBase, OutputFormat, SavedString } from "./types";
import * as path from "path";
import * as fs from "fs";
import { debug, warn } from "./logger";
import * as plantuml from "node-plantuml";

export class Converter {
  private readonly config: ConfigBase;

  constructor(config: ConfigBase) {
    this.config = config;
  }

  convert(pathOrType: string, puml: string): Promise<SavedString> {
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

  convertToImage(puml: string, format: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const formatMatch = format.match(/\w{3}/);

      if (!formatMatch) {
        return reject(new Error(`Cannot identify image format from ${format}`));
      }

      const outputFormat = formatMatch[0];

      // Validate format is supported
      if (outputFormat !== "svg" && outputFormat !== "png") {
        return reject(
          new Error(
            `Unsupported format: ${outputFormat}. Only svg and png are supported.`,
          ),
        );
      }

      debug(`Converting PlantUML to ${outputFormat} using local PlantUML`);

      // Chain requests to avoid concurrent PlantUML execution issues
      this.requestChain = this.requestChain.then(() => {
        return new Promise<Buffer>((resolveChain, rejectChain) => {
          const chunks: Buffer[] = [];
          const gen = plantuml.generate(puml, { format: outputFormat });

          gen.out.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          gen.out.on("end", () => {
            const result = Buffer.concat(chunks);
            debug(
              `Successfully generated ${outputFormat}, size: ${result.length} bytes`,
            );
            resolveChain(result);
            resolve(result);
          });

          gen.out.on("error", (err: Error) => {
            warn(`PlantUML conversion error: ${err.message}`);
            const errorMsg = this.getJavaInstallationErrorMessage(err);
            rejectChain(new Error(errorMsg));
            reject(new Error(errorMsg));
          });
        });
      });
    });
  }

  private getJavaInstallationErrorMessage(err: Error): string {
    const errMsg = err.message || "";

    if (errMsg.includes("ENOENT") || errMsg.includes("java")) {
      return (
        `PlantUML conversion failed: Java is not installed or not in PATH.\n` +
        `Please install Java Runtime Environment (JRE) 8 or higher:\n` +
        `  - Windows: Download from https://adoptium.net/\n` +
        `  - macOS: brew install openjdk\n` +
        `  - Linux: sudo apt-get install default-jre\n` +
        `Original error: ${errMsg}`
      );
    }

    return `PlantUML conversion failed: ${errMsg}`;
  }
}
