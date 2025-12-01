"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedString = exports.ConfigBase = exports.Context = exports.EMPTY_LAYER = void 0;
__exportStar(require("./schema"), exports);
exports.EMPTY_LAYER = Symbol("__empty_layer__");
var Context;
(function (Context) {
    Context[Context["LAYER"] = 0] = "LAYER";
    Context[Context["RELATIONSHIP"] = 1] = "RELATIONSHIP";
})(Context || (exports.Context = Context = {}));
class ConfigBase {
}
exports.ConfigBase = ConfigBase;
class SavedString extends String {
}
exports.SavedString = SavedString;
