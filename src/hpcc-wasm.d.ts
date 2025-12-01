declare module "@hpcc-js/wasm-graphviz" {
  export interface Graphviz {
    layout(
      dotSource: string,
      format?: string,
      engine?: string,
    ): Promise<string>;
  }

  export class Graphviz {
    static load(): Promise<Graphviz>;
  }
}
