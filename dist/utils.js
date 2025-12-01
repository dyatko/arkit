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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllStatements = exports.convertToRelative = exports.getAbsolute = exports.getAllComponents = exports.request = exports.bold = exports.verifyComponentFilters = exports.array = exports.safeRequire = exports.find = exports.match = exports.getPaths = exports.getMemoryUsage = exports.getStats = void 0;
const path = require("path");
const fs = require("fs");
const logger_1 = require("./logger");
const nanomatch = require("nanomatch");
const https = require("https");
const ts_morph_1 = require("ts-morph");
__exportStar(require("./logger"), exports);
const getStats = (path) => {
    try {
        const stats = fs.statSync(path);
        return {
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
        };
    }
    catch (e) {
        (0, logger_1.warn)(e);
        return {
            isDirectory: false,
            isFile: false,
        };
    }
};
exports.getStats = getStats;
const getMemoryUsage = () => {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed / memoryUsage.heapTotal;
};
exports.getMemoryUsage = getMemoryUsage;
const getPaths = (mainDirectory, directory, includePatterns, excludePatterns, history = []) => {
    const root = path.join(mainDirectory, directory);
    if (history.includes(root)) {
        (0, logger_1.warn)(`Skipping ${root} as it was parsed already`);
        return [];
    }
    else {
        history.push(root);
    }
    const usedMemory = (0, exports.getMemoryUsage)();
    if (usedMemory > 0.95) {
        (0, logger_1.warn)(`Stopping at ${root} since 95% of heap memory is used!`);
        return [];
    }
    return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
        const filePath = path.join(directory, fileName);
        const notExcluded = !excludePatterns.length || !(0, exports.match)(filePath, excludePatterns);
        if (notExcluded) {
            const fullPath = path.join(root, fileName);
            const stats = (0, exports.getStats)(fullPath);
            const isIncluded = (0, exports.match)(filePath, includePatterns);
            if (stats.isDirectory) {
                if (isIncluded) {
                    suitablePaths.push(path.join(fullPath, "**"));
                }
                else {
                    const childPaths = (0, exports.getPaths)(mainDirectory, filePath, includePatterns, excludePatterns, history);
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
exports.getPaths = getPaths;
const match = (filepath, patterns) => {
    return !patterns || !patterns.length || nanomatch.some(filepath, patterns);
};
exports.match = match;
const find = (filepath, patterns) => {
    return patterns.find((pattern) => nanomatch(filepath, pattern).length);
};
exports.find = find;
const safeRequire = (path) => {
    try {
        return require(path);
    }
    catch (e) {
        (0, logger_1.trace)(e.toString());
    }
};
exports.safeRequire = safeRequire;
const array = (input) => {
    if (input) {
        return [].concat(input);
    }
};
exports.array = array;
const verifyComponentFilters = (filters, component, mainDirectory) => {
    const matchesPatterns = !("filename" in component) ||
        (0, exports.match)(path.relative(mainDirectory, component.filename), filters.patterns);
    const matchesComponents = !filters.components ||
        filters.components.some((type) => type === component.type);
    return matchesPatterns && matchesComponents;
};
exports.verifyComponentFilters = verifyComponentFilters;
const bold = (str) => {
    return `<b>${str}</b>`;
};
exports.bold = bold;
/**
 * @deprecated This function is no longer used. PlantUML conversion is now done locally using node-plantuml.
 * Kept for backward compatibility only.
 */
const request = (path, payload) => {
    return new Promise((resolve, reject) => {
        const req = https
            .request({
            path,
            hostname: "arkit.pro",
            port: 443,
            method: "post",
            headers: {
                "Content-Type": "text/plain",
                "Content-Length": payload.length,
            },
        }, (res) => {
            const data = [];
            res.on("data", (chunk) => data.push(chunk));
            res.on("end", () => {
                resolve(Buffer.concat(data));
            });
        })
            .on("error", (err) => {
            reject(err);
        });
        req.write(payload);
        req.end();
    });
};
exports.request = request;
const getAllComponents = (layers, sortByName = false) => {
    const components = [].concat(...[...layers.values()].map((components) => [...components]));
    if (sortByName) {
        components.sort((a, b) => a.name.localeCompare(b.name));
    }
    return components;
};
exports.getAllComponents = getAllComponents;
const getAbsolute = (filepath, root = process.cwd()) => {
    return !path.isAbsolute(filepath) ? path.resolve(root, filepath) : filepath;
};
exports.getAbsolute = getAbsolute;
const convertToRelative = (paths, root, excludes = []) => {
    return paths.map((filepath) => {
        if (excludes.includes(filepath)) {
            return filepath;
        }
        return path.relative(root, (0, exports.getAbsolute)(filepath));
    });
};
exports.convertToRelative = convertToRelative;
const getAllStatements = (nodes, statements = []) => {
    return nodes.reduce((statements, node) => {
        try {
            const children = node.getChildren();
            if (ts_morph_1.TypeGuards.isStatement(node) || ts_morph_1.TypeGuards.isImportTypeNode(node)) {
                statements.push(node);
            }
            (0, exports.getAllStatements)(children, statements);
        }
        catch (e) {
            (0, logger_1.warn)(e);
        }
        return statements;
    }, statements);
};
exports.getAllStatements = getAllStatements;
