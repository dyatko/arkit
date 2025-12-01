"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Converter = void 0;
const types_1 = require("./types");
const path = require("path");
const fs = require("fs");
const logger_1 = require("./logger");
const plantuml = require("node-plantuml");
class Converter {
    constructor(config) {
        this.requestChain = Promise.resolve();
        this.config = config;
    }
    convert(pathOrType, puml) {
        const fullExportPath = path.resolve(this.config.directory, pathOrType);
        const ext = path.extname(fullExportPath);
        const shouldConvertAndSave = Object.values(types_1.OutputFormat).includes(ext.replace(".", ""));
        const shouldConvertAndOutput = Object.values(types_1.OutputFormat).includes(pathOrType);
        if (fs.existsSync(fullExportPath)) {
            (0, logger_1.debug)("Removing", fullExportPath);
            fs.unlinkSync(fullExportPath);
        }
        if (shouldConvertAndSave || shouldConvertAndOutput) {
            (0, logger_1.debug)("Converting", ext ? fullExportPath : pathOrType);
            return this.convertToImage(puml, ext || pathOrType)
                .then((image) => {
                if (shouldConvertAndSave) {
                    (0, logger_1.debug)("Saving", fullExportPath, image.length);
                    return this.save(fullExportPath, image);
                }
                return image.toString();
            })
                .catch((err) => {
                throw err;
            });
        }
        else {
            if (ext === ".puml") {
                (0, logger_1.debug)("Saving", fullExportPath);
                return this.save(fullExportPath, puml);
            }
            return Promise.resolve(puml);
        }
    }
    save(path, data) {
        const str = new types_1.SavedString(data.toString());
        str.path = path;
        fs.writeFileSync(path, data);
        return Promise.resolve(str);
    }
    convertToImage(puml, format) {
        return new Promise((resolve, reject) => {
            const formatMatch = format.match(/\w{3}/);
            if (!formatMatch) {
                return reject(new Error(`Cannot identify image format from ${format}`));
            }
            const outputFormat = formatMatch[0];
            // Validate format is supported
            if (outputFormat !== "svg" && outputFormat !== "png") {
                return reject(new Error(`Unsupported format: ${outputFormat}. Only svg and png are supported.`));
            }
            (0, logger_1.debug)(`Converting PlantUML to ${outputFormat} using local PlantUML`);
            // Chain requests to avoid concurrent PlantUML execution issues
            this.requestChain = this.requestChain.then(() => {
                return new Promise((resolveChain, rejectChain) => {
                    const chunks = [];
                    const gen = plantuml.generate(puml, { format: outputFormat });
                    gen.out.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    gen.out.on("end", () => {
                        const result = Buffer.concat(chunks);
                        (0, logger_1.debug)(`Successfully generated ${outputFormat}, size: ${result.length} bytes`);
                        resolveChain(result);
                        resolve(result);
                    });
                    gen.out.on("error", (err) => {
                        (0, logger_1.warn)(`PlantUML conversion error: ${err.message}`);
                        const errorMsg = this.getJavaInstallationErrorMessage(err);
                        rejectChain(new Error(errorMsg));
                        reject(new Error(errorMsg));
                    });
                });
            });
        });
    }
    getJavaInstallationErrorMessage(err) {
        const errMsg = err.message || "";
        if (errMsg.includes("ENOENT") || errMsg.includes("java")) {
            return (`PlantUML conversion failed: Java is not installed or not in PATH.\n` +
                `Please install Java Runtime Environment (JRE) 8 or higher:\n` +
                `  - Windows: Download from https://adoptium.net/\n` +
                `  - macOS: brew install openjdk\n` +
                `  - Linux: sudo apt-get install default-jre\n` +
                `Original error: ${errMsg}`);
        }
        return `PlantUML conversion failed: ${errMsg}`;
    }
}
exports.Converter = Converter;
