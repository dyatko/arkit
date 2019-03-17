"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const path = require("path");
const fs = require("fs");
const logger_1 = require("./logger");
const utils_1 = require("./utils");
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
            logger_1.debug("Removing", fullExportPath);
            fs.unlinkSync(fullExportPath);
        }
        if (shouldConvertAndSave || shouldConvertAndOutput) {
            logger_1.debug("Converting", ext ? fullExportPath : pathOrType);
            return this.convertToImage(puml, ext || pathOrType)
                .then(image => {
                if (shouldConvertAndSave) {
                    logger_1.debug("Saving", fullExportPath, image.length);
                    return this.save(fullExportPath, image);
                }
                return image.toString();
            })
                .catch(err => {
                throw err;
            });
        }
        else {
            if (ext === ".puml") {
                logger_1.debug("Saving", fullExportPath);
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
            const path = format.match(/\w{3}/);
            if (!path) {
                return reject(new Error(`Cannot identify image format from ${format}`));
            }
            this.requestChain = this.requestChain.then(() => {
                return utils_1.request(`/${path[0]}`, puml)
                    .then(result => resolve(result))
                    .catch(err => logger_1.debug(err));
            });
        });
    }
}
exports.Converter = Converter;
