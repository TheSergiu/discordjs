"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const commands_1 = require("./modules/commands");
const lfgNotify_1 = require("./modules/lfgNotify");
const lfg_1 = require("./modules/lfg");
const client_1 = require("./helpers/client");
console.log('Starting bot...');
(async () => {
    client_1.client.on('ready', () => {
        console.log(`Bot has started, with 
  ${client_1.client.users.cache.size} users, in 
  ${client_1.client.channels.cache.size} channels of 
  ${client_1.client.guilds.cache.size} guilds.`);
    });
    try {
        console.log('Starting modules...');
        new commands_1.Commands(client_1.client);
        new lfgNotify_1.LfgNotify(client_1.client);
        new lfg_1.LFGModule(client_1.client);
        console.log('Logging in to discord...');
        await client_1.loginClient();
        if (!client_1.client.readyAt) {
            console.log('Waiting on client to be ready...');
        }
        process.on('unhandledRejection', console.error);
        process.on('uncaughtException', console.error);
    }
    catch (e) {
        console.error('Fatal!:', e);
        setTimeout(() => process.exit(1), 1000);
    }
})();
//# sourceMappingURL=app.js.map