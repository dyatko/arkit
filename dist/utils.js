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
exports.getStats = (path) => {
    try {
        const stats = fs.statSync(path);
        return {
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile()
        };
    }
    catch (e) {
        logger_1.warn(e);
        return {
            isDirectory: false,
            isFile: false
        };
    }
};
exports.getMemoryUsage = () => {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed / memoryUsage.heapTotal;
};
exports.getPaths = (mainDirectory, directory, includePatterns, excludePatterns, history = []) => {
    const root = path.join(mainDirectory, directory);
    if (history.includes(root)) {
        logger_1.warn(`Skipping ${root} as it was parsed already`);
        return [];
    }
    else {
        history.push(root);
    }
    const usedMemory = exports.getMemoryUsage();
    if (usedMemory > 0.95) {
        logger_1.warn(`Stopping at ${root} since 95% of heap memory is used!`);
        return [];
    }
    return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
        const filePath = path.join(directory, fileName);
        const notExcluded = !excludePatterns.length || !exports.match(filePath, excludePatterns);
        if (notExcluded) {
            const fullPath = path.join(root, fileName);
            const stats = exports.getStats(fullPath);
            const isIncluded = exports.match(filePath, includePatterns);
            if (stats.isDirectory) {
                if (isIncluded) {
                    suitablePaths.push(path.join(fullPath, '**'));
                }
                else {
                    const childPaths = exports.getPaths(mainDirectory, filePath, includePatterns, excludePatterns, history);
                    suitablePaths.push(...childPaths);
                }
            }
            else if (stats.isFile && isIncluded) {
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
exports.bold = (str) => {
    return `<b>${str}</b>`;
};
