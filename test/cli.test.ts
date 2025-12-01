import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

jest.setTimeout(60000);

// Normalize SVG output by replacing environment-specific values
function normalizeSvg(svg: string): string {
  return (
    svg
      // Normalize PlantUML version timestamp (timezone variations)
      .replace(
        /PlantUML version [^\n]+/g,
        "PlantUML version 1.2019.06(NORMALIZED)",
      )
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

describe("CLI", () => {
  const arkit = path.resolve(__dirname, "../index.js");
  const exec = (command: string): string => {
    return execSync(command).toString().split(__dirname).join("__dirname");
  };

  describe("Options", () => {
    test("should output help", () => {
      expect(exec(`${arkit} -h`)).toMatchSnapshot();
    });
  });

  describe("Arkit", () => {
    describe("package.json", () => {
      const svgPath = path.resolve(__dirname, "../dist/arkit.svg");
      const pngPath = path.resolve(__dirname, "../dist/arkit.png");

      beforeAll(() => {
        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);
        if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);

        exec(`npm run architecture`);
      });

      test("should generate correct png", () => {
        const stat = fs.statSync(pngPath);

        // Verify file exists and has reasonable size (not empty, not too large)
        expect(stat.size).toBeGreaterThan(1000); // At least 1KB
        expect(stat.size).toBeLessThan(100000); // Less than 100KB

        // Verify it's a valid PNG by checking the header
        const buffer = fs.readFileSync(pngPath);
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        expect(buffer.subarray(0, 8).equals(pngHeader)).toBe(true);
      });

      test("should generate correct svg", () => {
        const svg = fs.readFileSync(svgPath).toString();
        expect(normalizeSvg(svg)).toMatchSnapshot();
      });
    });
  });

  describe("Sample", () => {
    describe("no args", () => {
      const dir = path.resolve(__dirname, "./sample");
      const pumlPath = path.resolve(dir, "./docs/architecture.puml");
      const svgPath = path.resolve(dir, "./docs/architecture.svg");

      beforeAll(() => {
        if (fs.existsSync(pumlPath)) fs.unlinkSync(pumlPath);
        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);

        process.chdir(dir);
        exec(arkit);
      });

      test("should generate correct puml", () => {
        expect(fs.readFileSync(pumlPath).toString()).toMatchSnapshot();
      });

      test("should generate correct svg", () => {
        const svg = fs.readFileSync(svgPath).toString();
        expect(normalizeSvg(svg)).toMatchSnapshot();
      });
    });
  });

  describe("Angular2 Todo", () => {
    describe("no args", () => {
      test("should output correct svg", () => {
        const dir = path.resolve(__dirname, "./angular2_es2015");

        process.chdir(dir);
        expect(exec(arkit)).toMatchSnapshot();
      });
    });

    describe("exclude and puml", () => {
      test("should output correct puml", () => {
        const dir = path.resolve(__dirname, "./angular2_es2015");

        process.chdir(dir);
        expect(
          exec(`${arkit} -o puml -e "app/components/**"`),
        ).toMatchSnapshot();
      });
    });
  });

  describe("Express", () => {
    describe("no args", () => {
      test("should output correct svg", () => {
        const dir = path.resolve(__dirname, "./express");
        const svgPath = path.resolve(dir, "./express.svg");

        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);

        process.chdir(dir);
        exec(arkit);

        expect(
          normalizeSvg(fs.readFileSync(svgPath).toString()),
        ).toMatchSnapshot();
      });
    });
  });

  describe("ReactDOM", () => {
    describe("config path", () => {
      test("should output correct svg", () => {
        const dir = path.resolve(__dirname, "./react-dom");
        const svgPath = path.resolve(dir, "./arkit.svg");

        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);

        process.chdir(dir);
        exec(`${arkit} -c react-arkit.json`);

        expect(
          normalizeSvg(fs.readFileSync(svgPath).toString()),
        ).toMatchSnapshot();
      });
    });
  });
});
