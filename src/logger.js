"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pino = require("pino");
const pinoDebug = require("pino-debug");
const logger = pino({
    name: 'arkit',
    level: process.env.LEVEL || 'error',
    base: null,
    prettyPrint: {
        colorize: true,
        translateTime: true
    }
});
pinoDebug(logger, {
    auto: true,
    map: {
        'arkit': 'error'
    }
});
exports.fatal = logger.fatal.bind(logger);
exports.error = logger.error.bind(logger);
exports.warn = logger.warn.bind(logger);
exports.info = logger.info.bind(logger);
exports.debug = logger.debug.bind(logger);
exports.trace = logger.trace.bind(logger);
