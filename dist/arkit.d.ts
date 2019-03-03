export interface Options {
    directory: string;
    output?: string[];
    first?: string[];
}
export declare const arkit: (options?: Options | undefined) => Promise<string[]>;
