import { OutputSchema } from "./schema";
import { Layers } from "./types";
export declare class PUML {
    from(output: OutputSchema, layers: Layers): string;
    private generatePlantUMLLayer;
    private generatePlantUMLComponent;
    private generatePlantUMLRelationships;
    private generatePlantUMLRelationship;
    private getConnectionLength;
    private getConnectionSign;
    private getConnectionStyle;
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    private generatePlantUMLSkin;
    private readonly staticSkinParams;
    private generatePlantUMLSkinParams;
}
//# sourceMappingURL=puml.d.ts.map