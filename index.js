#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const config_1 = require("./src/config");
const parser_1 = require("./src/parser");
const generator_1 = require("./src/generator");
const logger_1 = require("./src/logger");
exports.main = (directory) => {
    const config = new config_1.Config(directory);
    logger_1.debug(`Config ${config.path}`);
    logger_1.trace(config);
    const parser = new parser_1.Parser(config);
    const files = parser.parse();
    logger_1.trace('Parsed files');
    logger_1.trace(files);
    const generator = new generator_1.Generator(config, files);
    for (const output of config.outputs) {
        const puml = generator.generatePlantUML(output);
        if (config.path && output.path) {
            for (const outputPath of config.array(output.path)) {
                const fullExportPath = path.join(path.dirname(config.path), outputPath);
                const ext = path.extname(fullExportPath);
                if (fs.existsSync(fullExportPath)) {
                    fs.unlinkSync(fullExportPath);
                }
                if (ext === '.puml') {
                    fs.writeFileSync(fullExportPath, puml);
                }
                if (ext === '.svg') {
                    generator.convertToSVG(puml).then(svg => {
                        fs.writeFileSync(fullExportPath, svg);
                    }).catch(err => {
                        throw err;
                    });
                }
            }
        }
        else {
            console.log(puml);
        }
    }
};
if (require.main === module) {
    exports.main(process.cwd());
}
