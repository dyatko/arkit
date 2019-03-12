/// <reference types="node" />
import { GeneratorBase } from './generator.base';
export declare class Generator extends GeneratorBase {
    private progress;
    generate(): Promise<string[]>;
    private generatePlantUML;
    private generatePlantUMLLayer;
    private generatePlantUMLComponent;
    private generatePlantUMLRelationships;
    private getConnectionLength;
    private getConnectionSign;
    private getConnectionStyle;
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    private generatePlantUMLSkin;
    private generatePlantUMLSkinParams;
    private convert;
    requestChain: Promise<any>;
    convertToImage(puml: string, format: string): Promise<Buffer>;
    private request;
}
//# sourceMappingURL=generator.d.ts.map