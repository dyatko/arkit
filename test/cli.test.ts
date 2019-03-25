import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

jest.setTimeout(60000);

describe("CLI", () => {
  const arkit = path.resolve(__dirname, "../index.js");
  const exec = (command: string): string => {
    return execSync(command)
      .toString()
      .split(__dirname)
      .join("__dirname");
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

        expect({
          blksize: stat.blksize,
          blocks: stat.blocks,
          size: stat.size
        }).toMatchSnapshot();
      });

      test("should generate correct svg", () => {
        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot();
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
        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot();
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
          exec(`${arkit} -o puml -e "app/components/**"`)
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

        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot();
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

        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot();
      });
    });
  });
});
