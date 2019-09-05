import { ConfigBase, OutputFormat, SavedString } from "./types";
import * as path from "path";
import * as fs from "fs";
import { debug } from "./logger";
import { request } from "./utils";

export class Converter {
  private readonly config: ConfigBase;

  constructor(config: ConfigBase) {
    this.config = config;
  }

  convert(pathOrType: string, puml: string): Promise<SavedString> {
    const fullExportPath = path.resolve(this.config.directory, pathOrType);
    const ext = path.extname(fullExportPath);
    const shouldConvertAndSave = Object.values<any>(OutputFormat).includes(
      ext.replace(".", "")
    );
    const shouldConvertAndOutput = Object.values<any>(OutputFormat).includes(
      pathOrType
    );

    if (fs.existsSync(fullExportPath)) {
      debug("Removing", fullExportPath);
      fs.unlinkSync(fullExportPath);
    }

    if (shouldConvertAndSave || shouldConvertAndOutput) {
      debug("Converting", ext ? fullExportPath : pathOrType);
      return this.convertToImage(puml, ext || pathOrType)
        .then(image => {
          if (shouldConvertAndSave) {
            debug("Saving", fullExportPath, image.length);
            return this.save(fullExportPath, image);
          }

          return image.toString();
        })
        .catch(err => {
          throw err;
        });
    } else {
      if (ext === ".puml") {
        debug("Saving", fullExportPath);
        return this.save(fullExportPath, puml);
      }

      return Promise.resolve(puml);
    }
  }

  private save(path: string, data: Buffer | string): Promise<SavedString> {
    const str = new SavedString(data.toString());

    str.path = path;
    fs.writeFileSync(path, data);

    return Promise.resolve(str);
  }

  requestChain: Promise<any> = Promise.resolve();

  convertToImage(puml: string, format: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const path = format.match(/\w{3}/);

      if (!path) {
        return reject(new Error(`Cannot identify image format from ${format}`));
      }

      this.requestChain = this.requestChain.then(() => {
        return request(`/${path[0]}`, puml)
          .then(result => resolve(result))
          .catch(err => debug(err));
      });
    });
  }
}
