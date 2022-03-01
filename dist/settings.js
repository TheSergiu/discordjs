"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canBan = exports.canEditCommands = exports.withPrefix = exports.settings = void 0;
const fs_1 = require("fs");
const path = require("path");
exports.settings = JSON.parse(fs_1.readFileSync(path.join(__dirname, '..', 'settings.json')).toString());
const withPrefix = (s) => `${exports.settings.prefix}${s}`;
exports.withPrefix = withPrefix;
const rolesThatCanEdit = new Set(exports.settings.command_editors.map(x => x.toLowerCase()));
const rolesThatCanBAN = new Set(exports.settings.Banning_roles.map(x => x.toLowerCase()));
const canEditCommands = (member) => {
    return member.roles.cache.some(role => rolesThatCanEdit.has(role.name.toLowerCase()));
};
exports.canEditCommands = canEditCommands;
const canBan = (member) => {
    return member.roles.cache.some(role => rolesThatCanBAN.has(role.name.toLowerCase()));
};
exports.canBan = canBan;
//# sourceMappingURL=settings.js.map