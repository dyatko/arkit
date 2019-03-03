import { GeneratorBase } from './generator.base';
export declare class Generator extends GeneratorBase {
    generate(): Promise<string[]>;
    private generatePlantUML;
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
    private convert;
    requestChain: Promise<any>;
    convertToImage(puml: string, format: string): Promise<string>;
    private request;
}
//# sourceMappingURL=generator.d.ts.map