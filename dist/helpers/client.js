"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginClient = exports.client = void 0;
const Discord = require("discord.js");
const localClient = new Discord.Client({
    partials: ['USER', 'GUILD_MEMBER']
});
const token = process.env.DISCORD_TOKEN;
if (!token) {
    throw new Error("DISCORD_TOKEN not set in env vars");
}
exports.client = localClient;
let didLogin = false;
const loginClient = () => {
    if (didLogin)
        return;
    didLogin = true;
    return localClient.login(token);
};
exports.loginClient = loginClient;
//# sourceMappingURL=client.js.map