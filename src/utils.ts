import * as path from "path";
import * as fs from "fs";
import { trace, warn } from "./logger";
import * as nanomatch from "nanomatch";
import { Component, ComponentFilters, ComponentSchema, Layers } from "./types";
import * as https from "https";
import { Node, Statement, TypeGuards } from "ts-morph";

export * from "./logger";

export const getStats = (
  path: string
): { isDirectory: boolean; isFile: boolean } => {
  try {
    const stats = fs.statSync(path);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (e) {
    warn(e);
    return {
      isDirectory: false,
      isFile: false
    };
  }
};

export const getMemoryUsage = (): number => {
  const memoryUsage = process.memoryUsage();
  return memoryUsage.heapUsed / memoryUsage.heapTotal;
};

export const getPaths = (
  mainDirectory: string,
  directory: string,
  includePatterns: string[],
  excludePatterns: string[],
  history: string[] = []
): string[] => {
  const root = path.join(mainDirectory, directory);

  if (history.includes(root)) {
    warn(`Skipping ${root} as it was parsed already`);
    return [];
  } else {
    history.push(root);
  }

  const usedMemory = getMemoryUsage();

  if (usedMemory > 0.95) {
    warn(`Stopping at ${root} since 95% of heap memory is used!`);
    return [];
  }

  return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
    const filePath = path.join(directory, fileName);
    const notExcluded =
      !excludePatterns.length || !match(filePath, excludePatterns);

    if (notExcluded) {
      const fullPath = path.join(root, fileName);
      const stats = getStats(fullPath);
      const isIncluded = match(filePath, includePatterns);

      if (stats.isDirectory) {
        if (isIncluded) {
          suitablePaths.push(path.join(fullPath, "**"));
        } else {
          const childPaths = getPaths(
            mainDirectory,
            filePath,
            includePatterns,
            excludePatterns,
            history
          );
          suitablePaths.push(...childPaths);
        }
      } else if (stats.isFile && isIncluded) {
        suitablePaths.push(fullPath);
      }
    }

    return suitablePaths;
  }, [] as string[]);
};

export const match = (filepath: string, patterns?: string[]): boolean => {
  return !patterns || !patterns.length || nanomatch.some(filepath, patterns);
};

export const find = (
  filepath: string,
  patterns: string[]
): string | undefined => {
  return patterns.find(pattern => nanomatch(filepath, pattern).length);
};

export const safeRequire = <T>(path: string): T | undefined => {
  try {
    return require(path);
  } catch (e) {
    trace(e.toString());
  }
};

export const array = <T>(input?: T | T[]): T[] | undefined => {
  if (input) {
    return ([] as T[]).concat(input);
  }
};

export const verifyComponentFilters = (
  filters: ComponentFilters,
  component: Component | ComponentSchema,
  mainDirectory: string
): boolean => {
  const matchesPatterns =
    !("filename" in component) ||
    match(path.relative(mainDirectory, component.filename), filters.patterns);

  const matchesComponents =
    !filters.components ||
    filters.components.some(type => type === component.type);

  return matchesPatterns && matchesComponents;
};

export const bold = (str: string): string => {
  return `<b>${str}</b>`;
};

export const request = (path, payload): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const req = https
      .request(
        {
          path,
          hostname: "arkit.pro",
          port: 443,
          method: "post",
          headers: {
            "Content-Type": "text/plain",
            "Content-Length": payload.length
          }
        },
        res => {
          const data: Buffer[] = [];

          res.on("data", chunk => data.push(chunk));
          res.on("end", () => {
            resolve(Buffer.concat(data));
          });
        }
      )
      .on("error", err => {
        reject(err);
      });

    req.write(payload);
    req.end();
  });
};

export const getAllComponents = (
  layers: Layers,
  sortByName = false
): Component[] => {
  const components = ([] as Component[]).concat(
    ...[...layers.values()].map(components => [...components])
  );

  if (sortByName) {
    components.sort((a, b) => a.name.localeCompare(b.name));
  }

  return components;
};

export const getAbsolute = (filepath: string, root = process.cwd()): string => {
  return !path.isAbsolute(filepath) ? path.resolve(root, filepath) : filepath;
};

export const convertToRelative = (
  paths: string[],
  root: string,
  excludes: string[] = []
): string[] => {
  return paths.map(filepath => {
    if (excludes.includes(filepath)) {
      return filepath;
    }
    return path.relative(root, getAbsolute(filepath));
  });
};

export const getAllStatements = (
  nodes: Node[],
  statements: Statement[] = []
): Statement[] => {
  return nodes.reduce((statements, node) => {
    try {
      const children = node.getChildren();

      if (TypeGuards.isStatement(node) || TypeGuards.isImportTypeNode(node)) {
        statements.push(node as Statement);
      }

      getAllStatements(children, statements);
    } catch (e) {
      warn(e);
    }

    return statements;
  }, statements);
};
