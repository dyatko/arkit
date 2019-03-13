import * as path from "path";
import { arkit } from "../src/arkit";
import { SavedString } from "../src/types";

jest.setTimeout(60000);

expect.addSnapshotSerializer({
  test(value) {
    return value instanceof SavedString;
  },

  print(value: SavedString, serialize) {
    return serialize(value.toString());
  }
});

describe("Arkit", () => {
  test("Sample", () => {
    const directory = path.resolve(__dirname, "./sample");

    return arkit({ directory }).then(output => {
      expect(output).toMatchSnapshot();
    });
  });

  test("Angular2 Todo", () => {
    const directory = path.resolve(__dirname, "./angular2_es2015");

    return arkit({ directory }).then(output => {
      expect(output).toMatchSnapshot();
    });
  });

  test("Express", () => {
    const directory = path.resolve(__dirname, "./express");

    return arkit({ directory }).then(output => {
      expect(output).toMatchSnapshot();
    });
  });
});
