import * as path from "path";
import { Generator } from "../src/generator";
import { ConfigBase, ConfigSchema, Files, EMPTY_LAYER } from "../src/types";

const createConfig = (directory: string): ConfigBase => {
  return {
    directory,
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    final: {
      components: [
        {
          type: "Component",
          patterns: ["**/*.ts", "**/*.js"],
        },
      ],
      excludePatterns: [],
      output: [
        {
          path: ["svg"],
        },
      ],
    },
  } as ConfigBase;
};

describe("Generator", () => {
  describe("resolveConflictingComponentNames", () => {
    test("handles component names matching Object.prototype properties", () => {
      const directory = "/project";
      const config = createConfig(directory);

      const files: Files = {
        "/project/toString.ts": {
          exports: ["toString"],
          imports: {},
        },
        "/project/constructor.ts": {
          exports: ["Constructor"],
          imports: {},
        },
        "/project/valueOf.ts": {
          exports: ["valueOf"],
          imports: {},
        },
        "/project/app.ts": {
          exports: ["App"],
          imports: {
            "/project/toString.ts": ["toString"],
            "/project/constructor.ts": ["Constructor"],
          },
        },
      };

      const generator = new Generator(config, files);
      const output = config.final.output![0];

      // Should not throw TypeError: componentsByName[component.name].push is not a function
      expect(() => generator.generate(output)).not.toThrow();

      const layers = generator.generate(output);
      const allComponents = [...layers.values()].flatMap((set) => [...set]);
      const names = allComponents.map((c) => c.name);

      expect(names).toContain("toString");
      expect(names).toContain("constructor");
      expect(names).toContain("valueOf");
      expect(names).toContain("app");
    });
  });
});
