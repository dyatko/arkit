import { array, convertToRelative, getAbsolute, info, trace } from "./utils";
import { Config } from "./config";
import { Parser } from "./parser";
import { Generator } from "./generator";
import { Options, OutputFormat, OutputSchema, SavedString } from "./types";
import { cli } from "./cli";
import * as ProgressBar from "progress";
import { PUML } from "./puml";
import { Converter } from "./converter";

const getOptions = (options?: Options): Options => {
  const opts: Options = {
    ...cli.argv,
    ...options
  };

  opts.directory = getAbsolute(opts.directory);

  if (opts.first) {
    opts.first = convertToRelative(opts.first, opts.directory);
  }

  if (opts.output) {
    opts.output = convertToRelative(
      opts.output,
      opts.directory,
      Object.values(OutputFormat)
    );
  }

  if (opts.exclude) {
    opts.exclude = convertToRelative(opts.exclude, opts.directory);
  }

  return opts;
};

export const getConfig = (options?: Options): Config => {
  const opts = getOptions(options);
  info("Options");
  info(opts);

  return new Config(opts);
};

export const getOutputs = (config: Config): Promise<SavedString[]> => {
  const files = new Parser(config).parse();
  trace("Parsed files");
  trace(files);

  const outputs = config.final.output as OutputSchema[];
  const generator = new Generator(config, files);
  const converter = new Converter(config);
  const total = outputs.reduce(
    (total, output) => total + array(output.path)!.length,
    outputs.length * 2
  );
  const progress = new ProgressBar("Generating :bar", {
    total,
    clear: true,
    width: process.stdout.columns
  });

  return Promise.all(
    outputs.reduce((promises, output) => {
      const layers = generator.generate(output);
      progress.tick();

      const puml = new PUML().from(output, layers);
      progress.tick();

      const paths = array(output.path) as string[];

      for (const path of paths) {
        const promise = converter.convert(path, puml).then(value => {
          progress.tick();
          return value;
        });

        promises.push(promise);
      }

      return promises;
    }, [] as Promise<SavedString>[])
  );
};

export const arkit = (options?: Options): Promise<SavedString[]> => {
  const config = getConfig(options);
  info("Config");
  info(config);

  return getOutputs(config);
};
