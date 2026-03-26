import * as path from "path";
import { getPaths } from "../src/utils";

describe("getPaths", () => {
  const directory = path.resolve(__dirname, "./exclude-sample");

  test("excludes files matching **/*.test.* pattern", () => {
    const paths = getPaths(directory, "", ["**/*.ts"], ["**/*.test.*"]);
    const relative = paths.map((p) => path.relative(directory, p));

    expect(relative).toContain("src/app.ts");
    expect(relative).toContain("src/util.ts");
    expect(relative).not.toContain("src/app.test.ts");
    expect(relative).not.toContain("src/tests/helper.test.ts");
  });

  test("excludes directories matching bare word pattern", () => {
    const paths = getPaths(directory, "", ["**/*.ts"], ["tests"]);
    const relative = paths.map((p) => path.relative(directory, p));

    expect(relative).toContain("src/app.ts");
    expect(relative).toContain("src/util.ts");
    expect(relative).toContain("src/app.test.ts");
    // The 'tests' directory should be excluded
    expect(relative).not.toContain("src/tests/helper.test.ts");
  });

  test("excludes directories matching *test* glob pattern", () => {
    const paths = getPaths(directory, "", ["**/*.ts"], ["*test*"]);
    const relative = paths.map((p) => path.relative(directory, p));

    expect(relative).toContain("src/app.ts");
    expect(relative).toContain("src/util.ts");
    // Directories matching *test* should be excluded
    expect(relative).not.toContain("src/tests/helper.test.ts");
  });
});
