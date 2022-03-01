"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LFGModule = void 0;
const constants_1 = require("../../helpers/constants");
const ReactionManager_1 = require("../../helpers/ReactionManager");
const UserResponseManager_1 = require("../../helpers/UserResponseManager");
const helpers_1 = require("../../helpers");
const fs_1 = require("fs");
const message_manager_1 = require("./message-manager");
const settings_1 = require("./settings");
const cmd_helper_1 = require("../../helpers/cmd-helper");
const moment = require("moment-timezone");
const assert = require("assert");
var BILLBOARD_CHANNEL_ID = settings_1.LFGSettings.BILLBOARD_CHANNEL_ID;
var LFG_CREATE_TIMEOUT = settings_1.LFGSettings.LFG_CREATE_TIMEOUT;
var LFGFile = settings_1.LFGSettings.LFGFile;
class LFGModule {
    constructor(client) {
        this.instances = new Map();
        this.entries = {};
        this.raidCreateCommand = new cmd_helper_1.CmdHelper({
            //  type: CommandType.SUB_COMMAND_GROUP,
            name: `raid`,
            description: 'Organizare raiduri',
            options: [
                {
                    name: 'create',
                    description: 'Crează o organizare',
                    type: cmd_helper_1.CommandType.SUB_COMMAND,
                    required: false
                },
                {
                    name: 'edit',
                    description: 'Editează o organizare',
                    type: cmd_helper_1.CommandType.SUB_COMMAND,
                    required: false,
                    options: [{
                            type: cmd_helper_1.CommandType.STRING,
                            name: 'id',
                            description: 'ID-ul raidului',
                            required: true
                        }]
                },
                {
                    name: 'delete',
                    description: 'Șterge o organizare',
                    type: cmd_helper_1.CommandType.SUB_COMMAND,
                    required: false,
                    options: [{
                            type: cmd_helper_1.CommandType.STRING,
                            name: 'id',
                            description: 'ID-ul raidului',
                            required: true
                        }]
                },
            ]
        });
        this.usersInProgress = new Set;
        this.idsInProgress = new Set;
        this.save = () => {
            fs_1.writeFileSync(LFGFile, JSON.stringify(this.entries, null, 2));
        };
        this.saveEntry = (entryID, entry) => {
            this.entries[entryID] = entry;
            if (!entry) {
                delete this.entries[entryID];
                this.instances.delete(entryID);
            }
            this.save();
        };
        this.init = async () => {
            this.billboardChannel = await this.client.channels.fetch(BILLBOARD_CHANNEL_ID);
            for (const key in this.entries) {
                this.instances.set(key, new message_manager_1.LFGMessageManager(this.billboardChannel, this.entries[key], this.saveEntry.bind(this, key)));
            }
            await this.raidCreateCommand.ensure();
            this.raidCreateCommand.start();
        };
        this.findAvailableID = () => {
            for (let i = 0; i < 100; i++) {
                const id = (Math.random() * 10000).toFixed(0).padStart(4, '0');
                if (!this.idsInProgress.has(id) && !this.entries[id]) {
                    this.idsInProgress.add(id);
                    return id;
                }
            }
            for (let i = 1; i < 9999; i++) {
                const id = i.toString().padStart(4, '0');
                if (!this.idsInProgress.has(id) && !this.entries[id]) {
                    this.idsInProgress.add(id);
                    return id;
                }
            }
            throw new Error('Cannot generate more IDs');
        };
        this.dispatchOnInteraction = async (interaction) => {
            assert(interaction.data.options.length === 1);
            const subcommand = interaction.data.options[0];
            const guild = await this.client.guilds.fetch(interaction.guild_id);
            const channel = await this.client.channels.fetch(interaction.channel_id);
            const user = await this.client.users.fetch(interaction.member.user.id);
            const nicknameL = interaction.member.nick;
            let is_banned = interaction.member.user.id;
            let rolenameL = guild.roles.cache.get(settings_1.LFGSettings.BANNED_ROLE);
            let srch = false;
            for (let i in interaction.member.roles) {
                if (interaction.member.roles[i].match(rolenameL.id) !== null) {
                    srch = true;
                    break;
                }
            }
            //console.log("rolename by id: %s",rolenameL.name);
            //console.log("found: %s",srch);
            //return;
            if (srch) {
                await this.raidCreateCommand.respond(interaction, { content: 'Esti banat temporar de a participa la Raid-uri, contacteaza un admin pentru mai multe detalii' });
                return;
            }
            if (subcommand.name === 'create') {
                await this.raidCreateCommand.respond(interaction, {
                    content: 'Se crează o organizare nouă'
                });
                const myID = this.findAvailableID();
                this.usersInProgress.add(user.id);
                try {
                    const data = await this.lfgRaidLifeCycle(channel, user, myID, 'create', {});
                    this.entries[myID] = {
                        id: myID,
                        inexperienced: [],
                        alternatives: [],
                        participants: [{ username: user.username, id: user.id, nick: nicknameL }],
                        dueDate: data.time.getTime(),
                        desc: data.desc,
                        creator: { username: user.username, id: user.id, nick: nicknameL },
                        activity: data.activity
                    };
                    this.instances.set(myID, new message_manager_1.LFGMessageManager(this.billboardChannel, this.entries[myID], this.saveEntry.bind(this, myID)));
                    this.save();
                }
                catch (e) {
                    console.error(e);
                }
                finally {
                    this.idsInProgress.delete(myID);
                    this.usersInProgress.delete(user.id);
                }
            }
            if (subcommand.name === 'edit') {
                assert(subcommand.options.length === 1);
                const option = subcommand.options[0];
                assert(option.name === 'id');
                let id = option.value;
                id = id.padStart(4, '0');
                const instance = this.instances.get(id);
                if (!instance) {
                    return await this.raidCreateCommand.respond(interaction, {
                        content: `Organizarea [${id}] a expirat sau nu exista`
                    });
                }
                if (instance.owner.id !== user.id) {
                    return await this.raidCreateCommand.respond(interaction, {
                        content: `Organizarea [${id}] nu a fost creata de tine`
                    });
                }
                await this.raidCreateCommand.respond(interaction, {
                    content: `Se editează organizarea [${id}]`
                });
                const existingEntry = this.entries[id];
                const data = await this.lfgRaidLifeCycle(channel, user, id, 'update', {
                    date: existingEntry.dueDate,
                    desc: existingEntry.desc,
                    activity: existingEntry.activity
                });
                await instance.dispose();
                existingEntry.dueDate = data.time.getTime();
                existingEntry.desc = data.desc;
                existingEntry.activity = data.activity;
                this.instances.set(id, new message_manager_1.LFGMessageManager(this.billboardChannel, this.entries[id], this.saveEntry.bind(this, id)));
                this.save();
            }
            if (subcommand.name === 'delete') {
                assert(subcommand.options.length === 1);
                const option = subcommand.options[0];
                assert(option.name === 'id');
                let id = option.value;
                id = id.padStart(4, '0');
                const instance = this.instances.get(id);
                if (!instance) {
                    return await this.raidCreateCommand.respond(interaction, {
                        content: `Organizarea [${id}] a expirat sau nu exista`
                    });
                }
                if (instance.owner.id !== user.id) {
                    return await this.raidCreateCommand.respond(interaction, {
                        content: `Organizarea [${id}] nu a fost creata de tine`
                    });
                }
                await instance.finalizeAndMakeReadonly(true);
                return await this.raidCreateCommand.respond(interaction, {
                    content: `Organizarea [${id}] a fost stearsa`
                });
            }
        };
        this.dispatch = async (message) => {
            if (message.channel.type !== 'text')
                return;
            if (message.author.bot)
                return;
            const nicknameL = message.member.displayName;
            const { content, author, channel } = message;
            if (content.indexOf('/raid') !== 0)
                return;
            if (this.usersInProgress.has(author.id))
                return;
            if (/^\/raid\s*(?:del|delete)\s*(\d{1,4})$/i.test(content.trim())) {
                let [_, id] = /^\/raid\s*(?:del|delete)\s*(\d{1,4})$/i.exec(content.trim());
                id = id.padStart(4, '0');
                const instance = this.instances.get(id);
                if (!instance) {
                    return await channel.send(`Organizarea [${id}] a expirat sau nu exista`);
                }
                if (instance.owner.id !== author.id) {
                    return await channel.send(`Organizarea [${id}] nu a fost creata de tine`);
                }
                await instance.finalizeAndMakeReadonly(true);
                return await channel.send(`Organizarea [${id}] a fost stearsa`);
            }
            if (/^\/raid\s*(?:edit|update)\s*(\d{1,4})$/i.test(content.trim())) {
                let [_, id] = /^\/raid\s*(?:edit|update)\s*(\d{1,4})$/i.exec(content.trim());
                id = id.padStart(4, '0');
                const instance = this.instances.get(id);
                if (!instance) {
                    return await channel.send(`Organizarea [${id}] a expirat sau nu exista`);
                }
                if (instance.owner.id !== author.id) {
                    return await channel.send(`Organizarea [${id}] nu a fost creata de tine`);
                }
                const existingEntry = this.entries[id];
                const data = await this.lfgRaidLifeCycle(channel, author, id, 'update', {
                    date: existingEntry.dueDate,
                    desc: existingEntry.desc,
                    activity: existingEntry.activity
                });
                await instance.dispose();
                existingEntry.dueDate = data.time.getTime();
                existingEntry.desc = data.desc;
                existingEntry.activity = data.activity;
                this.instances.set(id, new message_manager_1.LFGMessageManager(this.billboardChannel, this.entries[id], this.saveEntry.bind(this, id)));
                this.save();
            }
            if (/^\/raid\s*(create)?$/gi.test(content)) {
                const myID = this.findAvailableID();
                this.usersInProgress.add(author.id);
                try {
                    const data = await this.lfgRaidLifeCycle(channel, author, myID, 'create', {});
                    this.entries[myID] = {
                        id: myID,
                        inexperienced: [],
                        alternatives: [],
                        participants: [{ username: author.username, id: author.id, nick: nicknameL }],
                        dueDate: data.time.getTime(),
                        desc: data.desc,
                        creator: { username: author.username, id: author.id, nick: nicknameL },
                        activity: data.activity
                    };
                    this.instances.set(myID, new message_manager_1.LFGMessageManager(this.billboardChannel, this.entries[myID], this.saveEntry.bind(this, myID)));
                    this.save();
                }
                catch (e) {
                    console.error(e);
                }
                finally {
                    this.idsInProgress.delete(myID);
                    this.usersInProgress.delete(author.id);
                }
            }
        };
        this.lfgRaidLifeCycle = async (channel, user, id, type, hints) => {
            const footer = { text: `\n\nID ${id} by ${user.username}` };
            let question;
            try {
                question = await channel.send({
                    embed: {
                        title: 'Alege Raid',
                        fields: [
                            {
                                name: constants_1.EMPTY_SPACE,
                                value: helpers_1.mapObj(settings_1.LFGEmojis).map(([act, emoji]) => `${emoji.text} ${act}`).join(`\n`)
                            },
                            ...(hints.activity ? [
                                { name: 'Alegerea curenta', value: hints.activity }
                            ] : [])
                        ],
                        footer
                    }
                });
                await Promise.all(helpers_1.values(settings_1.LFGEmojis)
                    .map(x => question.react(encodeURIComponent(x.unicode))));
                const chooseRaidResponse = await helpers_1.timeoutPromise(new ReactionManager_1.OneReactionWaiter(question, user).waitReactionAndDispose(), LFG_CREATE_TIMEOUT);
                const activity = helpers_1.keys(settings_1.LFGEmojis).find(key => settings_1.LFGEmojis[key].unicode === chooseRaidResponse.reaction.emoji.name);
                assert(activity, 'cannot find activity for emoji ' + chooseRaidResponse.reaction.emoji.name);
                console.log('LFG', id, 'activity', activity);
                await question.reactions.removeAll();
                await question.edit({
                    embed: {
                        title: 'Scrie ora si data',
                        fields: [
                            {
                                name: 'Format',
                                value: `\
HH:mm DD/MM sau \`now\` / \`acum\`

Exemplu: ${moment().tz('EET').format('HH:mm DD/MM')} sau ${moment().tz('EET').format('HH:mm')}
Ora trebuie sa fie in format de 24h`
                            },
                            {
                                name: 'Ora RO curenta (EET)',
                                value: moment().tz('EET').format('HH:mm DD/MM')
                            },
                            ...(hints.date ? [{
                                    name: 'Ora setata anterior (EET)',
                                    value: moment(hints.date).tz('EET').format('HH:mm DD/MM')
                                }] : []),
                        ],
                        footer
                    }
                });
                const textResponseWaiter = new UserResponseManager_1.UserResponseManager(channel, user);
                let time = null;
                while (!time) {
                    const resp = await textResponseWaiter.waitResponseAndDeleteMessage(LFG_CREATE_TIMEOUT);
                    console.log('LFG', id, 'time/date', 'input', resp.content);
                    const content = resp.content.toString().toLowerCase().trim();
                    if (constants_1.timeFormatRegex.test(content)) {
                        const [_, h, m, D = moment().tz('EET').format('DD'), M = moment().tz('EET').format('MM')] = constants_1.timeFormatRegex.exec(content);
                        time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET', true).toDate();
                        if (time && !helpers_1.isDateValid(time)) {
                            channel.send(`Data "${content}" nu este corecta.`).then(async (m) => {
                                await helpers_1.sleep(5000);
                                return m.delete();
                            }).catch(console.error);
                            time = null;
                        }
                        if (time && time.getTime() < Date.now() - 60 * 1000) {
                            channel.send('Nu poti crea o organizare in trecut.').then(async (m) => {
                                await helpers_1.sleep(5000);
                                return m.delete();
                            }).catch(console.error);
                            time = null;
                        }
                    }
                    if (content === 'now' || content === 'acum') {
                        time = new Date(Date.now() + 10 * 60 * 1000);
                    }
                }
                console.log('LFG', id, 'time/date', 'settled', time);
                await question.edit({
                    embed: {
                        title: 'Informatii despre activitate',
                        fields: [
                            {
                                name: constants_1.EMPTY_SPACE,
                                value: 'Adauga informatii extra despre activitate sau scrie `none` / `nimic`'
                            },
                            ...(hints.desc ? [{
                                    name: 'Descrierea precedenta',
                                    value: hints.desc
                                }] : [])
                        ],
                        footer
                    }
                });
                let desc = (await textResponseWaiter.waitResponseAndDeleteMessage(LFG_CREATE_TIMEOUT)).content.trim();
                if (desc.toLowerCase() === 'none' || desc.toLowerCase() === 'nimic') {
                    desc = null;
                }
                console.log('LFG', id, 'desc:', desc);
                if (type === 'create') {
                    await channel.send(`Evenimentul ${id} a fost creat pe ${helpers_1.channelID2Text(BILLBOARD_CHANNEL_ID)} de catre ${helpers_1.userID2Text(user.id)}!`);
                }
                else {
                    await channel.send(`Evenimentul ${id} a fost actualizat de catre ${helpers_1.userID2Text(user.id)}!`);
                }
                return { time, id, desc, activity };
            }
            catch (e) {
                if (e instanceof helpers_1.PromiseTimeoutError) {
                    console.log(`LFG Event ${id} has timed out`);
                    if (type === 'create') {
                        await channel.send(`Crearea evenimentului [${id}] de catre <@${user.id}> a expirat!`);
                    }
                    else {
                        await channel.send(`Actualizarea evenimentului [${id}] de catre <@${user.id}> a expirat!`);
                    }
                }
                throw e;
            }
            finally {
                await question.delete();
            }
        };
        this.client = client;
        this.entries = fs_1.existsSync(LFGFile) ? JSON.parse(fs_1.readFileSync(LFGFile).toString()) : {};
        this.client.on('message', this.dispatch);
        this.client.once('ready', this.init);
        this.raidCreateCommand.on('command', this.dispatchOnInteraction);
    }
}
exports.LFGModule = LFGModule;
//# sourceMappingURL=index.js.map