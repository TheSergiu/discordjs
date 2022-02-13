"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const path = require("path");
const fs_1 = require("fs");
const settings_1 = require("../settings");
const helpers_1 = require("../helpers");
const pad = require("pad");
const CREATE_COMMAND = 'create';
const EDIT_COMMAND = 'edit';
const DEL_COMMAND = 'del';
const COMMANDS_COMMAND = 'commands';
const HELP_COMMAND = 'help';
const commandsDbPath = path.join(process.cwd(), 'db', 'commands.json');
class Commands {
    constructor(client) {
        var _a;
        this.db = {};
        this.save = () => {
            fs_1.writeFileSync(commandsDbPath, JSON.stringify(this.db, null, 2));
        };
        this.load = () => {
            this.db = JSON.parse(fs_1.readFileSync(commandsDbPath).toString());
        };
        this.sendNoPerms = (message) => {
            return message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
        };
        this.dispatch = (message) => {
            if (message.channel.type !== 'text')
                return;
            if (message.author.bot)
                return;
            const { member } = message;
            if (!member) {
                return console.warn('no member for message', message);
            }
            const [command, commandMessage] = helpers_1.splitOnFirst(message.content, " ");
            if (command === settings_1.withPrefix(CREATE_COMMAND)) {
                return this.setCommand(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member, 'create');
            }
            if (command === settings_1.withPrefix(EDIT_COMMAND)) {
                return this.setCommand(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member, 'edit');
            }
            if (command === settings_1.withPrefix(DEL_COMMAND)) {
                return this.delCommand(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member);
            }
            if (command === settings_1.withPrefix(HELP_COMMAND) || command === settings_1.withPrefix(COMMANDS_COMMAND)) {
                return this.listCommands(message, member);
            }
            return this.sendMessageIfCommand(message);
        };
        this.setCommand = (text, message, member, type) => {
            if (!settings_1.canEditCommands(member)) {
                return this.sendNoPerms(message);
            }
            let [commandName, commandText] = helpers_1.splitOnFirst(text, "|").map(x => x === null || x === void 0 ? void 0 : x.trim());
            if (!(commandName === null || commandName === void 0 ? void 0 : commandName.trim()) ||
                !(commandText === null || commandText === void 0 ? void 0 : commandText.trim()) ||
                !/^(?:\?|\!)?[a-z0-9\-._#$%^&*]*$/ig.test(commandName === null || commandName === void 0 ? void 0 : commandName.trim())) {
                return message.channel.send(`Sintaxa corecta este \`${settings_1.withPrefix(type === 'create' ? CREATE_COMMAND : EDIT_COMMAND)} nume-comanda | text comanda\``);
            }
            commandName = commandName.toLowerCase();
            if (commandName[0] === settings_1.settings.prefix) {
                commandName = commandName.substr(1);
            }
            if (type === "create" &&
                (this.db[commandName] ||
                    [CREATE_COMMAND, EDIT_COMMAND, DEL_COMMAND, COMMANDS_COMMAND, HELP_COMMAND].indexOf(commandName) !== -1)) {
                return message.channel.send(`Comanda \`${settings_1.withPrefix(commandName)}\` exista deja`);
            }
            this.db[commandName] = commandText;
            this.save();
            console.log(`${type.toUpperCase()}: ${message.author.username} | ${commandName} -> ${commandText}`);
            return message.channel.send(`Comanda \`${settings_1.withPrefix(commandName)}\` a fost ${type === 'create' ? 'creata' : 'modificata'}!`);
        };
        this.delCommand = (text, message, member) => {
            var _a, _b;
            if (!settings_1.canEditCommands(member)) {
                return this.sendNoPerms(message);
            }
            let commandName = (_b = (_a = text === null || text === void 0 ? void 0 : text.trim()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
            if (!commandName) {
                return message.channel.send(`Sintaxa corecta este \`${settings_1.withPrefix(DEL_COMMAND)} nume-comanda\``);
            }
            if (!this.db[commandName]) {
                return message.channel.send(`Comanda \`${settings_1.withPrefix(commandName)}\` nu exista`);
            }
            delete this.db[commandName];
            this.save();
            console.log(`DEL: ${message.author.username} | ${commandName}`);
            return message.channel.send(`Comanda \`${settings_1.withPrefix(commandName)}\` a fost stearsa!`);
        };
        this.listCommands = async (message, member) => {
            const adminCommands = settings_1.canEditCommands(member) ? [
                '--------- Administrare ---------',
                `\`${settings_1.withPrefix(CREATE_COMMAND)} nume-comanda | text comanda\` - creaza o comanda`,
                `\`${settings_1.withPrefix(EDIT_COMMAND)} nume-comanda | text comanda\` - modifica o comanda`,
                `\`${settings_1.withPrefix(DEL_COMMAND)} nume-comanda\` - sterge o comanda`,
            ] : [];
            const commands = [
                ...adminCommands,
                `\`${settings_1.withPrefix(HELP_COMMAND)}\` / \`${settings_1.withPrefix(COMMANDS_COMMAND)}\` - vezi comenzi disponibile`,
                '---------- Comenzi existente -----------',
                ...Object.keys(this.db).map(x => `\`${pad(settings_1.withPrefix(x), 20, ' ')}\` -> ${helpers_1.text2codeBlock(this.db[x])}`)
            ];
            await helpers_1.sendMessage(commands, message.channel);
        };
        this.sendMessageIfCommand = (message) => {
            const text = message.content.toLowerCase().trim();
            Object.keys(this.db).forEach(key => {
                if (settings_1.withPrefix(key) === text) {
                    console.log(text, 'matched command', key);
                    return message.channel.send({
                        content: this.db[key],
                        split: {
                            char: '\n',
                            maxLength: 1950
                        }
                    });
                }
            });
        };
        this.load();
        this.client = client;
        this.client.on('message', this.dispatch);
        (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity(settings_1.withPrefix(HELP_COMMAND), { type: "PLAYING" }).catch(console.error);
    }
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map