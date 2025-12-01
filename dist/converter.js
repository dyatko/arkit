"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Converter = void 0;
const types_1 = require("./types");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = require("./logger");
class Converter {
    constructor(config) {
        this.backend = null;
        this.graphviz = null;
        this.requestChain = Promise.resolve();
        this.config = config;
    }
    // Initialize the appropriate backend
    initializeBackend() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.backend) {
                return this.backend;
            }
            // Try WASM first (default - eliminates GraphViz system dependency)
            // Note: Java is still required for PlantUML, but GraphViz is not
            try {
                const { Graphviz } = yield Promise.resolve().then(() => __importStar(require("@hpcc-js/wasm-graphviz")));
                this.graphviz = yield Graphviz.load();
                // Verify Java is available for PlantUML
                yield Promise.resolve().then(() => __importStar(require("node-plantuml")));
                this.backend = "wasm";
                (0, logger_1.info)("Using Java PlantUML + @hpcc-js/wasm-graphviz (no GraphViz system dependency)");
                return "wasm";
            }
            catch (wasmError) {
                (0, logger_1.warn)(`@hpcc-js/wasm-graphviz not available: ${wasmError.message}, falling back to system GraphViz`);
                // Fall back to system GraphViz
                try {
                    yield Promise.resolve().then(() => __importStar(require("node-plantuml")));
                    this.backend = "java";
                    (0, logger_1.info)("Using Java PlantUML + system GraphViz (requires Java + GraphViz installed)");
                    return "java";
                }
                catch (javaError) {
                    throw new Error(`No diagram renderer available.\n` +
                        `@hpcc-js/wasm error: ${wasmError.message}\n` +
                        `Java/PlantUML error: ${javaError.message}\n\n` +
                        `Please install Java Runtime Environment (JRE) 8+:\n` +
                        `  - Windows: https://adoptium.net/\n` +
                        `  - macOS: brew install openjdk\n` +
                        `  - Linux: sudo apt-get install default-jre\n\n` +
                        `Then either:\n` +
                        `  1. npm install @hpcc-js/wasm-graphviz (recommended, no GraphViz needed)\n` +
                        `  2. Install GraphViz: https://graphviz.org/download/`);
                }
            }
        });
    }
    convert(pathOrType, puml) {
        return __awaiter(this, void 0, void 0, function* () {
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
                // Initialize backend on first conversion
                yield this.initializeBackend();
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
        });
    }
    save(path, data) {
        const str = new types_1.SavedString(data.toString());
        str.path = path;
        fs.writeFileSync(path, data);
        return Promise.resolve(str);
    }
    convertToImage(puml, format) {
        return __awaiter(this, void 0, void 0, function* () {
            const formatMatch = format.match(/\w{3}/);
            if (!formatMatch) {
                throw new Error(`Cannot identify image format from ${format}`);
            }
            const outputFormat = formatMatch[0];
            // Validate format is supported
            if (outputFormat !== "svg" && outputFormat !== "png") {
                throw new Error(`Unsupported format: ${outputFormat}. Only svg and png are supported.`);
            }
            if (!this.backend) {
                throw new Error("Backend not initialized");
            }
            if (this.backend === "wasm") {
                return this.convertWithWasm(puml, outputFormat);
            }
            else {
                return this.convertWithSystemGraphviz(puml, outputFormat);
            }
        });
    }
    convertWithWasm(puml, format) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.debug)(`Converting PlantUML to ${format} using Java PlantUML + @hpcc-js/wasm GraphViz`);
            try {
                const plantuml = yield Promise.resolve().then(() => __importStar(require("node-plantuml")));
                // Use PlantUML to generate the requested format (svg or png)
                const output = yield new Promise((resolve, reject) => {
                    const chunks = [];
                    const errorChunks = [];
                    const gen = plantuml.generate(puml, {
                        format: format,
                    });
                    gen.out.on("data", (chunk) => chunks.push(chunk));
                    gen.out.on("end", () => {
                        let result = Buffer.concat(chunks);
                        // If SVG, check for multiple XML declarations (PlantUML error output)
                        // and keep only the first complete SVG document
                        if (format === "svg") {
                            const svgString = result.toString();
                            const firstSvgEnd = svgString.indexOf("</svg>");
                            if (firstSvgEnd !== -1) {
                                const secondXmlStart = svgString.indexOf('<?xml version="1.0"', firstSvgEnd);
                                if (secondXmlStart !== -1) {
                                    // Multiple SVG documents found, keep only the first one
                                    result = Buffer.from(svgString.substring(0, firstSvgEnd + 6));
                                    (0, logger_1.debug)(`Filtered duplicate PlantUML output (error SVG), kept first ${result.length} bytes`);
                                }
                            }
                        }
                        resolve(result);
                    });
                    gen.out.on("error", reject);
                });
                (0, logger_1.debug)(`Successfully generated ${format} using WASM backend, size: ${output.length} bytes`);
                return output;
            }
            catch (error) {
                (0, logger_1.warn)(`WASM conversion error: ${error.message}`);
                throw new Error(`WASM conversion failed: ${error.message}`);
            }
        });
    }
    convertWithSystemGraphviz(puml, format) {
        (0, logger_1.debug)(`Converting PlantUML to ${format} using Java PlantUML + system GraphViz`);
        return new Promise((resolve, reject) => {
            // Chain requests to avoid concurrent PlantUML execution issues
            this.requestChain = this.requestChain.then(() => __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolveChain, rejectChain) => {
                    const plantuml = require("node-plantuml");
                    const chunks = [];
                    const gen = plantuml.generate(puml, { format });
                    gen.out.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    gen.out.on("end", () => {
                        const result = Buffer.concat(chunks);
                        (0, logger_1.debug)(`Successfully generated ${format} using system GraphViz, size: ${result.length} bytes`);
                        resolveChain(result);
                        resolve(result);
                    });
                    gen.out.on("error", (err) => {
                        (0, logger_1.warn)(`System GraphViz conversion error: ${err.message}`);
                        const errorMsg = this.getSystemDependencyErrorMessage(err);
                        rejectChain(new Error(errorMsg));
                        reject(new Error(errorMsg));
                    });
                });
            }));
        });
    }
    getSystemDependencyErrorMessage(err) {
        const errMsg = err.message || "";
        if (errMsg.includes("ENOENT") || errMsg.includes("java")) {
            return (`PlantUML conversion failed: Java is not installed or not in PATH.\n` +
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
                `Original error: ${errMsg}`);
        }
        if (errMsg.includes("dot") || errMsg.includes("graphviz")) {
            return (`GraphViz not found. Please either:\n` +
                `  1. npm install @hpcc-js/wasm-graphviz (recommended, no system dependency)\n` +
                `  2. Install GraphViz system-wide:\n` +
                `     - Windows: https://graphviz.org/download/\n` +
                `     - macOS: brew install graphviz\n` +
                `     - Linux: sudo apt-get install graphviz\n\n` +
                `Original error: ${errMsg}`);
        }
        return `PlantUML conversion failed: ${errMsg}`;
    }
}
exports.Converter = Converter;
