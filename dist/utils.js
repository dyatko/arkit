"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const logger_1 = require("./logger");
const nanomatch = require("nanomatch");
__export(require("./logger"));
exports.getPaths = (mainDirectory, directory, includePatterns, excludePatterns) => {
    const root = path.join(mainDirectory, directory);
    return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
        const filePath = path.join(directory, fileName);
        const notExcluded = !excludePatterns.length || !exports.match(filePath, excludePatterns);
        if (notExcluded) {
            const fullPath = path.join(root, fileName);
            const stats = fs.statSync(fullPath);
            const isIncluded = exports.match(filePath, includePatterns);
            if (stats.isDirectory()) {
                if (isIncluded) {
                    suitablePaths.push(path.join(fullPath, '**'));
                }
                else {
                    const childPaths = exports.getPaths(mainDirectory, filePath, includePatterns, excludePatterns);
                    suitablePaths.push(...childPaths);
                }
            }
            else if (stats.isFile() && isIncluded) {
                suitablePaths.push(fullPath);
            }
        }
        return suitablePaths;
    }, []);
};
exports.match = (filepath, patterns) => {
    return !patterns || !patterns.length || nanomatch.some(filepath, patterns);
};
exports.find = (filepath, patterns) => {
    return patterns.find(pattern => nanomatch(filepath, pattern).length);
};
exports.safeRequire = (path) => {
    try {
        return require(path);
    }
    catch (e) {
        logger_1.trace(e.toString());
    }
};
exports.array = (input) => {
    if (input) {
        return [].concat(input);
    }
};
exports.verifyComponentFilters = (filters, component, mainDirectory) => {
    const matchesPatterns = !('filename' in component) ||
        exports.match(path.relative(mainDirectory, component.filename), filters.patterns);
    const matchesComponents = !filters.components ||
        filters.components.some(type => type === component.type);
    return matchesPatterns && matchesComponents;
};
