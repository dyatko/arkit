import * as path from "path";

// Mock the cli module to avoid yargs ESM issues in Jest
jest.mock("../src/cli", () => ({
  cli: {
    argv: {
      directory: ".",
      config: "arkit.json",
      output: ["arkit.svg"],
    },
  },
}));

import { arkit } from "../src/arkit";
import { SavedString } from "../src/types";

jest.setTimeout(60000);

// Normalize SVG output by replacing environment-specific values
function normalizeSvg(svg: string): string {
  return (
    svg
      // Normalize PlantUML filter IDs (random per run) - must be before number normalization
      .replace(/id="f[a-z0-9]+"/g, 'id="FILTER"')
      .replace(/url\(#f[a-z0-9]+\)/g, "url(#FILTER)")
      // Normalize all numeric values (coordinates, dimensions, textLength differ between GraphViz versions)
      // No \b anchors: SVG path data has digits after letters (e.g. "M207.0") with no word boundary
      .replace(/\d+(\.\d+)?/g, "0")
      // Normalize PlantUML version timestamp (timezone variations)
      .replace(/PlantUML version [^\n]+/g, "PlantUML version NORMALIZED")
      // Normalize operating system name (macOS vs Linux in CI)
      .replace(/Operating System: [^\n<]+/g, "Operating System: NORMALIZED")
      // Normalize Java version
      .replace(/Java Version: [^\n<]+/g, "Java Version: NORMALIZED")
      // Normalize OS version
      .replace(/OS Version: [^\n<]+/g, "OS Version: NORMALIZED")
      // Normalize country (can be null or US)
      .replace(/Country: [^\n<]+/g, "Country: NORMALIZED")
      // Normalize machine name
      .replace(/Machine: [^\n<]+/g, "Machine: NORMALIZED")
      // Normalize memory values (can vary)
      .replace(/Max Memory: [\d,]+/g, "Max Memory: NORMALIZED")
      .replace(/Total Memory: [\d,]+/g, "Total Memory: NORMALIZED")
      .replace(/Free Memory: [\d,]+/g, "Free Memory: NORMALIZED")
      .replace(/Used Memory: [\d,]+/g, "Used Memory: NORMALIZED")
  );
}

expect.addSnapshotSerializer({
  test(value) {
    return value instanceof SavedString;
  },

  print(value: SavedString, serialize) {
    const content = value.toString();
    // Normalize SVG content to make snapshots environment-agnostic
    const normalized = content.includes("<?xml")
      ? normalizeSvg(content)
      : content;
    return serialize(normalized);
  },
});

describe("Arkit", () => {
  test("Sample", () => {
    const directory = path.resolve(__dirname, "./sample");

    process.chdir(directory);

    return arkit({ directory }).then((output) => {
      expect(output).toMatchSnapshot();
    });
  });

  test("Angular2 Todo", () => {
    const directory = path.resolve(__dirname, "./angular2_es2015");

    process.chdir(directory);

    return arkit({ directory }).then((output) => {
      expect(output).toMatchSnapshot();
    });
  });

  test("Express", () => {
    const directory = path.resolve(__dirname, "./express");

    process.chdir(directory);

    return arkit({ directory }).then((output) => {
      expect(output).toMatchSnapshot();
    });
  });
});
