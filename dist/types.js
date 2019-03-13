"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./schema"));
exports.EMPTY_LAYER = Symbol("__empty_layer__");
var Context;
(function (Context) {
    Context[Context["LAYER"] = 0] = "LAYER";
    Context[Context["RELATIONSHIP"] = 1] = "RELATIONSHIP";
})(Context = exports.Context || (exports.Context = {}));
class ConfigBase {
}
exports.ConfigBase = ConfigBase;
class SavedString extends String {
}
exports.SavedString = SavedString;
