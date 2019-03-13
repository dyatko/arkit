import * as path from "path";
import { Config } from "../src/config";
import { Parser } from "../src/parser";
import { Files } from "../src/types";

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
});
