"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputFormat = exports.OutputDirection = exports.ComponentNameFormat = void 0;
/**
 * Component name formats
 */
var ComponentNameFormat;
(function (ComponentNameFormat) {
    ComponentNameFormat["BASE_NAME"] = "base";
    ComponentNameFormat["FULL_NAME"] = "full";
    ComponentNameFormat["COMPLETE_PATH"] = "complete";
})(ComponentNameFormat || (exports.ComponentNameFormat = ComponentNameFormat = {}));
var OutputDirection;
(function (OutputDirection) {
    OutputDirection["HORIZONTAL"] = "horizontal";
    OutputDirection["VERTICAL"] = "vertical";
})(OutputDirection || (exports.OutputDirection = OutputDirection = {}));
var OutputFormat;
(function (OutputFormat) {
    OutputFormat["SVG"] = "svg";
    OutputFormat["PNG"] = "png";
})(OutputFormat || (exports.OutputFormat = OutputFormat = {}));
