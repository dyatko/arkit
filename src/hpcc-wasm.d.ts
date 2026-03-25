declare module "@hpcc-js/wasm-graphviz" {
  export class Graphviz {
    static load(): Promise<Graphviz>;
    layout(dotSource: string, format?: string, engine?: string): string;
    dot(dotSource: string, format?: string): string;
  }
}
