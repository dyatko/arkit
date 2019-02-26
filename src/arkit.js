"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const logger_1 = require("./logger");
const config_1 = require("./config");
const parser_1 = require("./parser");
const generator_1 = require("./generator");
const getOptions = (options) => {
    const opts = Object.assign({}, options, { directory: (options && options.directory) || '' });
    const directory = path.isAbsolute(opts.directory) ? opts.directory : path.join(process.cwd(), opts.directory);
    return {
        directory
    };
};
exports.arkit = (options) => {
    const opts = getOptions(options);
    logger_1.debug('Options');
    logger_1.debug(opts);
    const config = new config_1.Config(opts);
    logger_1.debug('Config');
    logger_1.debug(config);
    const parser = new parser_1.Parser(config);
    const files = parser.parse();
    logger_1.trace('Parsed files');
    logger_1.trace(files);
    const generator = new generator_1.Generator(config, files);
    return Promise.all(config.outputs.map(output => {
        const puml = generator.generatePlantUML(output);
        if (output.path) {
            for (const outputPath of config.array(output.path)) {
                const fullExportPath = path.join(config.directory, outputPath);
                const ext = path.extname(fullExportPath);
                if (fs.existsSync(fullExportPath)) {
                    logger_1.debug('Removing', fullExportPath);
                    fs.unlinkSync(fullExportPath);
                }
                if (ext === '.puml') {
                    logger_1.debug('Saving', fullExportPath);
                    fs.writeFileSync(fullExportPath, puml);
                }
                if (ext === '.svg' || ext === '.png') {
                    logger_1.debug('Converting', fullExportPath);
                    generator.convertToSVG(puml).then(svg => {
                        logger_1.debug('Saving', fullExportPath);
                        fs.writeFileSync(fullExportPath, svg);
                    }).catch(err => {
                        throw err;
                    });
                }
            }
            return puml;
        }
        return generator.convertToSVG(puml).then(svg => {
            console.log(svg);
            return puml;
        }).catch(err => {
            throw err;
        });
    }));
};
