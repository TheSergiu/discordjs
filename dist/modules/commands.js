"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const path = require("path");
const fs_1 = require("fs");
const settings_1 = require("../settings");
const helpers_1 = require("../helpers");
const scheduler_1 = require("../helpers/scheduler");
const settings_2 = require("../modules/lfg/settings");
const pad = require("pad");
const constants_1 = require("../helpers/constants");
const moment = require("moment-timezone");
const helpers_2 = require("../helpers");
const CREATE_COMMAND = 'create';
const EDIT_COMMAND = 'edit';
const DEL_COMMAND = 'del';
const COMMANDS_COMMAND = 'commands';
const HELP_COMMAND = 'help';
const BAN_COMMAND = 'raid-ban';
const BAN_LIST = 'ban-list';
const UNBAN_COMMAND = "raid-unban";
const commandsDbPath = path.join(process.cwd(), 'db', 'commands.json');
const BAN_file = path.join(process.cwd(), 'db', 'banned.json');
class Commands {
    constructor(client) {
        var _a;
        this.db = {};
        this.scheduledJobs = [];
        this.BanList = [];
        this.dbBan = {};
        this.save = () => {
            fs_1.writeFileSync(commandsDbPath, JSON.stringify(this.db, null, 2));
        };
        this.save_bans = () => {
            console.log('writing to file: %s', BAN_file);
            fs_1.writeFileSync(BAN_file, JSON.stringify(this.dbBan, null, 2));
            console.log('writing data: %s', this.dbBan);
        };
        this.load = () => {
            this.db = JSON.parse(fs_1.readFileSync(commandsDbPath).toString());
        };
        this.loadBans = () => {
            this.dbBan = fs_1.existsSync(BAN_file) ? JSON.parse(fs_1.readFileSync(BAN_file).toString()) : {};
            var bans;
            var bans_local;
            let zi;
            for (const key in this.dbBan) {
                bans = this.dbBan[key];
                zi = new Date(bans.dueDate);
                bans_local = { guild_id: bans.guild_id, id_banned_by: bans.id_banned_by, id_banned_user: bans.id_banned_user, dueDate: zi, banned_by: bans.banned_by, banned_user: bans.banned_user };
                this.BanList.push(bans_local);
                this.scheduledJobs.push(new scheduler_1.ScheduleTask(bans_local.dueDate, this.notify));
                //console.log('ban data %s',bans_local.dueDate.getDate());
            }
            //this.notify();
        };
        this.sendNoPerms = (message) => {
            return message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
        };
        this.sendNoPermsBAN = (message) => {
            return message.channel.send('Nu ai rolul necesar pentru a bana un user');
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
            if (command === settings_1.withPrefix(BAN_COMMAND)) {
                return this.BAN_user(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member);
            }
            if (command === settings_1.withPrefix(UNBAN_COMMAND)) {
                return this.UNBAN_user(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member);
            }
            if (command === settings_1.withPrefix(BAN_LIST)) {
                return this.listBAN(commandMessage !== null && commandMessage !== void 0 ? commandMessage : '', message, member);
            }
            return this.sendMessageIfCommand(message);
        };
        this.notify = async () => {
            if (!this.client) {
                console.log('wating for client to be ready for unban');
                this.scheduledJobs.push(new scheduler_1.ScheduleTask(Date.now() + 5000, this.notify));
            }
            for (const entry of this.BanList) {
                if (entry.dueDate && entry.dueDate.getTime() < Date.now()) {
                    console.log('user unbanned %s', entry);
                    const idx = this.BanList.indexOf(entry);
                    delete this.dbBan[entry.id_banned_user];
                    this.BanList.splice(idx, 1);
                    //todo:remove role
                    const guild = this.client.guilds.cache.get(entry.guild_id); // copy the id of the server your bot is in and paste it in place of guild-ID.
                    const role = guild.roles.cache.get(settings_2.LFGSettings.BANNED_ROLE); // here we are getting the role object using the id of that role.
                    const member = await guild.members.fetch(entry.id_banned_user); // here we are getting the member object using the id of that member. This is the member we will add the role to.
                    member.roles.remove(role); // here we just added the role to the member we got.
                }
                else {
                    console.log('user still banned %s', entry);
                }
            }
            this.save_bans();
        };
        this.UNBAN_user = async (text, message, member) => {
            const user_local = message.mentions.users.first();
            if (user_local)
                console.log('user banat: %s - %s', user_local.username, user_local.id);
            else
                return message.channel.send('Error finding user');
            for (const entry of this.BanList) {
                if (entry.id_banned_user === user_local.id) {
                    if (entry.id_banned_by === message.author.id) {
                        console.log('user unbanned %s', entry);
                        const idx = this.BanList.indexOf(entry);
                        delete this.dbBan[entry.id_banned_user];
                        this.BanList.splice(idx, 1);
                        //todo:remove role
                        const guild = this.client.guilds.cache.get(entry.guild_id); // copy the id of the server your bot is in and paste it in place of guild-ID.
                        const role = guild.roles.cache.get(settings_2.LFGSettings.BANNED_ROLE); // here we are getting the role object using the id of that role.
                        const member = await guild.members.fetch(entry.id_banned_user); // here we are getting the member object using the id of that member. This is the member we will add the role to.
                        member.roles.remove(role); // here we just added the role to the member we got.
                    }
                    else {
                        return message.channel.send(`Nu esti autorul BAN-ului, autorul este:  \`${entry.banned_by}\`, contacteaza autorul pt unban`);
                    }
                }
                else {
                    console.log('user still banned %s', entry);
                }
            }
            this.save_bans();
        };
        this.BAN_user = async (text, message, member) => {
            if (!settings_1.canBan(member)) {
                return this.sendNoPermsBAN(message);
            }
            const user_local = message.mentions.users.first();
            if (user_local)
                console.log('user banat: %s - %s', user_local.username, user_local.id);
            else
                return message.channel.send('Error finding user');
            let time = null;
            while (!time) {
                const resp = message;
                const content = resp.content.toString().toLowerCase().trim();
                if (constants_1.dataFormatRegex.test(content)) {
                    const [_, D, M, h = moment().tz('EET').format('HH'), m = moment().tz('EET').format('mm'),] = constants_1.dataFormatRegex.exec(content);
                    time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET', true).toDate();
                    if (time && !helpers_2.isDateValid(time)) {
                        return message.channel.send('Data nu este corecta');
                    }
                    if (time && time.getTime() < Date.now() - 60 * 1000) {
                        return message.channel.send('Data este in trecut.');
                    }
                }
                else {
                    return message.channel.send('Data nu este corecta');
                    break;
                }
            }
            //console.log('time/date', 'settled', time);
            //console.log('user banat de: %s',message.author.username,message.author.id);
            var new_ban;
            new_ban = { guild_id: message.guild.id, id_banned_by: message.author.id, id_banned_user: user_local.id, dueDate: time, banned_by: message.author.username, banned_user: user_local.username };
            var gasit = false;
            var idx_ = 0;
            console.log('ban data %s', new_ban.dueDate);
            for (const entry of this.BanList) {
                if (entry.id_banned_user == new_ban.id_banned_user) {
                    if (entry.dueDate < new_ban.dueDate) {
                        this.BanList[idx_].dueDate = new_ban.dueDate;
                        //console.log(`adaugat timp user \`${new_ban.banned_user}\` by \`${new_ban.banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth()+1}\r\n`);
                        this.scheduledJobs.push(new scheduler_1.ScheduleTask(time, this.notify));
                        var str_ban = { guild_id: message.guild.id, id_banned_by: message.author.id, id_banned_user: user_local.id, dueDate: time.toDateString(), banned_by: message.author.username, banned_user: user_local.username };
                        this.dbBan[user_local.id] = str_ban;
                        this.save_bans();
                        return message.channel.send(`Adaugat timp user \`${this.BanList[idx_].banned_user}\` by \`${this.BanList[idx_].banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth() + 1}\r\n`);
                    }
                    else {
                        return message.channel.send(`User deja banat \`${this.BanList[idx_].banned_user}\` by \`${this.BanList[idx_].banned_by}\` -> ${this.BanList[idx_].dueDate.getDate()} \/ ${this.BanList[idx_].dueDate.getMonth() + 1}\r\n`);
                    }
                    gasit = true;
                }
                idx_++;
            }
            if (!gasit) {
                this.BanList.push(new_ban);
                this.scheduledJobs.push(new scheduler_1.ScheduleTask(time, this.notify));
                const guild = this.client.guilds.cache.get(message.guild.id); // copy the id of the server your bot is in and paste it in place of guild-ID.
                const role = guild.roles.cache.get(settings_2.LFGSettings.BANNED_ROLE); // here we are getting the role object using the id of that role.
                const member = await guild.members.fetch(user_local.id); // here we are getting the member object using the id of that member. This is the member we will add the role to.
                member.roles.add(role); // here we just added the role to the member we got.
                var str_ban = { guild_id: message.guild.id, id_banned_by: message.author.id, id_banned_user: user_local.id, dueDate: time.toDateString(), banned_by: message.author.username, banned_user: user_local.username };
                this.dbBan[user_local.id] = str_ban;
                //console.log('writing data: %s',this.dbBan);
                this.save_bans();
                return message.channel.send(`Banned user \`${new_ban.banned_user}\` by \`${new_ban.banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth() + 1}\r\n`);
            }
            return message.channel.send('Error banning user!');
        };
        this.listBAN = (text, message, member) => {
            if (!settings_1.canBan(member)) {
                return this.sendNoPermsBAN(message);
            }
            var idx = 0;
            var out_str = '';
            var local_str = '';
            for (const entry of this.BanList) {
                //console.log('banned user %s by %s -> %s\r\n',entry.banned_user,entry.banned_by,entry.dueDate);
                local_str = `Banned user \`${entry.banned_user}\` by \`${entry.banned_by}\` -> ${entry.dueDate.getDate()} \/ ${entry.dueDate.getMonth() + 1}\r\n`;
                //console.log(local_str);
                out_str = out_str + local_str;
                idx++;
            }
            console.log(out_str.length);
            if (out_str.length > 0) {
                return message.channel.send(out_str);
            }
            else {
                return message.channel.send('No banned user in this server!');
            }
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
        this.loadBans();
        this.client = client;
        this.client.on('message', this.dispatch);
        (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity(settings_1.withPrefix(HELP_COMMAND), { type: "PLAYING" }).catch(console.error);
        //console.log('reading data: %s',this.dbBan);
        //console.log('writing data: %s',this.db);
    }
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map