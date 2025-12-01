// Type definitions for node-plantuml
declare module "node-plantuml" {
  import { Readable } from "stream";

  interface GenerateOptions {
    format?:
      | "png"
      | "svg"
      | "eps"
      | "pdf"
      | "vdx"
      | "xmi"
      | "scxml"
      | "html"
      | "txt"
      | "utxt"
      | "latex";
    charset?: string;
    config?: string;
  }

  interface GenerateResult {
    out: Readable;
  }

  export function generate(
    puml: string,
    options?: GenerateOptions,
  ): GenerateResult;
  export function useNailgun(options?: any): void;
  export function encode(puml: string): string;
  export function decode(encoded: string): string;
}
