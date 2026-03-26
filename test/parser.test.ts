import * as path from "path";
import * as utils from "../src/utils";
import { Config } from "../src/config";
import { Parser } from "../src/parser";
import { Files } from "../src/types";

// Mock memory usage to avoid Node 20 heap pressure with --coverage
jest.spyOn(utils, "getMemoryUsage").mockReturnValue(0.5);

const cleanSnapshot = (directory: string, files: Files): Files => {
  const re = new RegExp(directory + "/?", "g");
  const cleanFiles = JSON.parse(JSON.stringify(files).replace(re, ""));
  const parentDirectory = path.resolve(directory, "..");

  return parentDirectory === "/"
    ? cleanFiles
    : cleanSnapshot(parentDirectory, cleanFiles);
};

describe("Parser", () => {
  test("Arkit", () => {
    const directory = path.resolve(__dirname, "../src");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    expect(files).toMatchSnapshot();
  });

  test("Sample", () => {
    const directory = path.resolve(__dirname, "./sample");
    const config = new Config({ directory });
    const parser = new Parser(config);
    const files = cleanSnapshot(directory, parser.parse());

    expect(files).toMatchSnapshot();
  });

  test("Angular2 Todo", () => {
    const directory = path.resolve(__dirname, "./angular2_es2015");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    expect(files).toMatchSnapshot();
  });

  test("Express", () => {
    const directory = path.resolve(__dirname, "./express");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    expect(files).toMatchSnapshot();
  });

  test("Vue with class attribute", () => {
    const directory = path.resolve(__dirname, "./vue-sample");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    // Should parse Vue files with class attributes without errors
    const fileKeys = Object.keys(files);
    expect(fileKeys.some((f) => f.includes("App.vue"))).toBe(true);
    expect(fileKeys.some((f) => f.includes("Hello.vue"))).toBe(true);

    // App.vue should have imports to Hello.vue
    const appFile = Object.entries(files).find(([k]) => k.includes("App.vue"));
    expect(appFile).toBeDefined();
    const appImports = Object.keys(appFile![1].imports);
    expect(appImports.some((i) => i.includes("Hello.vue"))).toBe(true);
  });

  test("CommonJS module.exports and exports.* detected", () => {
    const directory = path.resolve(__dirname, "./commonjs-sample");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    // helper.js should have named exports detected
    const helperFile = Object.entries(files).find(([k]) =>
      k.includes("helper.js"),
    );
    expect(helperFile).toBeDefined();
    expect(helperFile![1].exports.length).toBeGreaterThan(0);

    // index.js should have exports detected (module.exports = {...})
    const indexFile = Object.entries(files).find(([k]) =>
      k.includes("index.js"),
    );
    expect(indexFile).toBeDefined();
    expect(indexFile![1].exports.length).toBeGreaterThan(0);

    // app.js should import both helper and index
    const appFile = Object.entries(files).find(([k]) => k.includes("app.js"));
    expect(appFile).toBeDefined();
    const appImports = Object.keys(appFile![1].imports);
    expect(appImports.some((i) => i.includes("helper.js"))).toBe(true);
    expect(appImports.some((i) => i.includes("index.js"))).toBe(true);
  });

  test("jsconfig.json baseUrl resolves bare imports", () => {
    const directory = path.resolve(__dirname, "./jsconfig-sample");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    // app.js should have its require('utils') resolved to src/utils.js via baseUrl
    const appFile = Object.entries(files).find(([k]) => k.includes("app.js"));
    expect(appFile).toBeDefined();
    const appImports = Object.keys(appFile![1].imports);
    expect(appImports.some((i) => i.includes("utils.js"))).toBe(true);
  });

  test("Path aliases with @/ resolved via tsconfig", () => {
    const directory = path.resolve(__dirname, "./alias-sample");
    const parser = new Parser(new Config({ directory }));
    const files = cleanSnapshot(directory, parser.parse());

    // app.ts should have its @/utils import resolved to src/utils.ts
    const appFile = Object.entries(files).find(([k]) => k.includes("app.ts"));
    expect(appFile).toBeDefined();
    const appImports = Object.keys(appFile![1].imports);
    expect(appImports.some((i) => i.includes("utils.ts"))).toBe(true);
  });
});
