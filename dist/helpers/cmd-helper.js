"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdHelper = exports.CommandType = void 0;
const events_1 = require("events");
const client_1 = require("./client");
var CommandType;
(function (CommandType) {
    CommandType[CommandType["SUB_COMMAND"] = 1] = "SUB_COMMAND";
    CommandType[CommandType["SUB_COMMAND_GROUP"] = 2] = "SUB_COMMAND_GROUP";
    CommandType[CommandType["STRING"] = 3] = "STRING";
    CommandType[CommandType["INTEGER"] = 4] = "INTEGER";
    CommandType[CommandType["BOOLEAN"] = 5] = "BOOLEAN";
    CommandType[CommandType["USER"] = 6] = "USER";
    CommandType[CommandType["CHANNEL"] = 7] = "CHANNEL";
    CommandType[CommandType["ROLE"] = 8] = "ROLE";
})(CommandType = exports.CommandType || (exports.CommandType = {}));
class CmdHelper extends events_1.EventEmitter {
    constructor(command) {
        super();
        this.commandID = null;
        this.ensure = async () => {
            for (const guild of client_1.client.guilds.cache.values()) {
                console.log(`Creating command "${this.command.name}" for guild "${guild.name}"`);
                const resp = await client_1.client
                    .api
                    .applications(client_1.client.user.id)
                    //.guilds(guild.id)
                    .commands
                    .post({
                    data: this.command
                });
                this.commandID = resp.id;
            }
        };
        this.start = () => {
            if (!this.commandID) {
                throw new Error('Cannot start listen without ensuring command.');
            }
            client_1.client.ws.on('INTERACTION_CREATE', async (interaction) => {
                this.emit('command', interaction);
            });
        };
        this.respond = async (interaction, response) => {
            await client_1.client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: response
                }
            });
        };
        this.command = command;
    }
}
exports.CmdHelper = CmdHelper;
//# sourceMappingURL=cmd-helper.js.map