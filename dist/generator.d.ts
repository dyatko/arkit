import { OutputSchema } from './schema';
import { GeneratorBase } from './generator.base';
export declare class Generator extends GeneratorBase {
    generatePlantUML(output: OutputSchema): string;
    private generatePlantUMLLayer;
    private generatePlantUMLComponent;
    private generatePlantUMLRelationships;
    private getConnectionLength;
    private getConnectionSign;
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    private generatePlantUMLSkin;
    private generatePlantUMLSkinParams;
    convert(pathOrType: string, puml: string): Promise<string>;
    requestChain: Promise<any>;
    convertToImage(puml: string, format: string): Promise<string>;
    private request;
}
