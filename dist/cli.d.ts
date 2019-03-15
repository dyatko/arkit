import * as yargs from "yargs";
export declare const cli: yargs.Argv<yargs.Omit<{
    directory: string;
} & {
    first: string | undefined;
} & {
    exclude: string;
} & {
    output: unknown;
}, "first" | "exclude" | "output"> & {
    exclude: string[] | undefined;
    first: string[] | undefined;
    output: string[] | undefined;
}>;
//# sourceMappingURL=cli.d.ts.map