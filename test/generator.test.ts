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

    test("gives unique names to same-named modules in different directories", () => {
      const directory = "/project";
      const config = createConfig(directory);

      const files: Files = {
        "/project/core/users.ts": {
          exports: ["CoreUser"],
          imports: {},
        },
        "/project/database/users.ts": {
          exports: ["DbUser"],
          imports: {},
        },
        "/project/app.ts": {
          exports: ["App"],
          imports: {
            "/project/core/users.ts": ["CoreUser"],
            "/project/database/users.ts": ["DbUser"],
          },
        },
      };

      const generator = new Generator(config, files);
      const output = config.final.output![0];
      const layers = generator.generate(output);
      const allComponents = [...layers.values()].flatMap((set) => [...set]);
      const names = allComponents.map((c) => c.name);

      // Both "users" modules should have distinct names
      const usersNames = names.filter((n) => n.includes("users"));
      expect(usersNames.length).toBe(2);
      expect(new Set(usersNames).size).toBe(2); // All unique
      expect(usersNames).toContain(path.join("core", "users"));
      expect(usersNames).toContain(path.join("database", "users"));
    });

    test("handles deeper nesting with same parent directory names", () => {
      const directory = "/project";
      const config = createConfig(directory);

      const files: Files = {
        "/project/a/shared/utils.ts": {
          exports: ["aUtils"],
          imports: {},
        },
        "/project/b/shared/utils.ts": {
          exports: ["bUtils"],
          imports: {},
        },
        "/project/main.ts": {
          exports: ["main"],
          imports: {
            "/project/a/shared/utils.ts": ["aUtils"],
            "/project/b/shared/utils.ts": ["bUtils"],
          },
        },
      };

      const generator = new Generator(config, files);
      const output = config.final.output![0];
      const layers = generator.generate(output);
      const allComponents = [...layers.values()].flatMap((set) => [...set]);
      const names = allComponents.map((c) => c.name);

      // Both "utils" modules have parent dir "shared", so they need deeper disambiguation
      const utilsNames = names.filter((n) => n.includes("utils"));
      expect(utilsNames.length).toBe(2);
      expect(new Set(utilsNames).size).toBe(2); // All unique
    });
  });
});
