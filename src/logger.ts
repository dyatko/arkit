import * as pino from "pino";

const logger = pino({
  name: "arkit",
  level: process.env.LEVEL || "error",
  base: null,
  prettyPrint: {
    colorize: true,
    translateTime: true,
  },
});

export const fatal = logger.fatal.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const info = logger.info.bind(logger);
export const debug = logger.debug.bind(logger);
export const trace = logger.trace.bind(logger);
