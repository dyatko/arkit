"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trace = exports.debug = exports.info = exports.warn = exports.error = exports.fatal = void 0;
const pino_1 = require("pino");
const logger = (0, pino_1.default)({
    name: "arkit",
    level: process.env.LEVEL || "error",
    base: null,
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: true,
        },
    },
});
exports.fatal = logger.fatal.bind(logger);
exports.error = logger.error.bind(logger);
exports.warn = logger.warn.bind(logger);
exports.info = logger.info.bind(logger);
exports.debug = logger.debug.bind(logger);
exports.trace = logger.trace.bind(logger);
