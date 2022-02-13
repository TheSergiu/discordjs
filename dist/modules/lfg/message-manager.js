"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LFGMessageManager = void 0;
const discord_js_1 = require("discord.js");
const ReactionManager_1 = require("../../helpers/ReactionManager");
const constants_1 = require("../../helpers/constants");
const assert = require("assert");
const types_1 = require("./types");
const settings_1 = require("./settings");
const helpers_1 = require("../../helpers");
const scheduler_1 = require("../../helpers/scheduler");
const cleanup_1 = require("../../helpers/cleanup");
const moment = require("moment-timezone");
const Color = require("color");
var ROLE_TO_NOTIFY_ID = settings_1.LFGSettings.ROLE_TO_NOTIFY_ID;
var scheduleMessageDeletion = cleanup_1.CleanUp.scheduleMessageDeletion;
var LFG_DELETE_MESSAGE_AFTER = settings_1.LFGSettings.LFG_DELETE_MESSAGE_AFTER;
class LFGMessageManager {
    constructor(channel, data, saveDelegate) {
        this.inexperiencedString = `${constants_1.EMOJIS.baby_bottle.text}`;
        this.authorString = `${constants_1.EMOJIS.crown.text}`;
        this.scheduledJobs = [];
        this.disposed = false;
        this.dispose = () => {
            var _a;
            if (this.disposed)
                return console.warn(`LFG Instance ${this.data.id} already disposed`);
            console.log(`Disposed LFG ${this.data.id}`);
            (_a = this.reactionManager) === null || _a === void 0 ? void 0 : _a.dispose();
            for (const job of this.scheduledJobs) {
                job.cancel();
            }
            this.disposed = true;
            this.saveDelegate = () => console.warn(`Tried to save data for LFG ${this.data.id} after it's disposal`);
        };
        this.init = async () => {
            const isNewMessage = !this.data.messageID;
            if (isNewMessage) {
                this.message = await this.channel.send({
                    embed: { title: `Organizare noua de ${settings_1.LFGAssets[this.data.activity].name}` },
                    content: `${helpers_1.roleID2Text(ROLE_TO_NOTIFY_ID)} - Organizare noua de ${settings_1.LFGAssets[this.data.activity].name}`
                });
            }
            else {
                try {
                    this.message = await this.channel.messages.fetch(this.data.messageID);
                }
                catch (e) {
                    this.saveDelegate(null);
                    throw e;
                }
            }
            this.data.messageID = this.message.id;
            this.client.on('messageDelete', args => {
                if (args.id === this.data.messageID) {
                    console.log(`Deleted LFG message for entry ${this.data.id}`);
                    this.saveDelegate(null);
                    this.dispose();
                }
            });
            await this.paintMessage();
            // repaint after 10 seconds
            // sometimes the first paint fails???
            setTimeout(this.paintMessage, 10 * 1000);
            if (isNewMessage) {
                await Promise.all([
                    this.message.react(encodeURIComponent(constants_1.EMOJIS.white_check_mark.unicode)),
                    this.data.activity !== types_1.LFGActivity.all ?
                        this.message.react(encodeURIComponent(constants_1.EMOJIS.new.unicode))
                        : null,
                    this.message.react(encodeURIComponent(constants_1.EMOJIS.x.unicode)),
                    this.message.react(encodeURIComponent(constants_1.EMOJIS.question.unicode)),
                ]);
            }
            this.reactionManager = new ReactionManager_1.MessageReactionManager(this.message);
            this.reactionManager.on('reaction', this.reactionDispatch);
            this.notifyChannel = await this.client.channels.fetch(settings_1.LFGSettings.CHANNEL_TO_NOTIFY_ID);
            const timeLeft = this.data.dueDate - Date.now();
            if (timeLeft > 0) {
                if (timeLeft > 60 * 60 * 1000) {
                    this.scheduledJobs.push(new scheduler_1.ScheduleTask(this.data.dueDate - 60 * 60 * 1000, this.notify));
                }
                if (timeLeft < 60 * 60 * 1000 && timeLeft > 10 * 60 * 1000) {
                    this.scheduledJobs.push(new scheduler_1.ScheduleTask(Date.now() + 1000, this.notify));
                }
                if (timeLeft > 10 * 60 * 1000) {
                    this.scheduledJobs.push(new scheduler_1.ScheduleTask(this.data.dueDate - 10 * 60 * 1000 - 1000, this.notify));
                }
                if (timeLeft < 10 * 60 * 1000 && timeLeft > 5 * 60 * 1000) {
                    this.scheduledJobs.push(new scheduler_1.ScheduleTask(Date.now() + 1000, this.notify));
                }
                this.scheduledJobs.push(new scheduler_1.ScheduleTask(this.data.dueDate, this.finalizeAndMakeReadonly));
            }
            else {
                await this.finalizeAndMakeReadonly();
            }
        };
        this.notify = async () => {
            const timeLeft = moment(this.data.dueDate, undefined, 'ro').tz('EET');
            const diff = moment(this.data.dueDate - Date.now()).tz('UTC');
            let singular = ((diff.dayOfYear() - 1 === 1) ||
                (diff.dayOfYear() - 1 === 0 && diff.hours() === 1) ||
                (diff.dayOfYear() - 1 === 0 && diff.hours() === 0 && diff.minutes() === 1));
            const timeLeftString = timeLeft.fromNow(true);
            if (!singular && (timeLeftString === 'o oră' || timeLeftString === 'o ora')) {
                console.warn('failed to set singular properly', {
                    dayOfYear: diff.dayOfYear(),
                    hours: diff.hours(),
                    minutes: diff.minutes(),
                    diff: this.data.dueDate - Date.now()
                });
                singular = true;
            }
            console.log('LFG', this.data.id, 'notifying', timeLeftString);
            await this.notifyChannel.send(`\
${singular ? 'A' : 'Au'} mai ramas ${timeLeftString} pana la organizarea de ${settings_1.LFGAssets[this.data.activity].name} [${this.data.id}]
Participanti: ${this.participants.map(x => helpers_1.userID2Text(x.id)).join(', ') || '-'}
Rezerve: ${this.alternatives.map(x => helpers_1.userID2Text(x.id)).join(', ') || '-'}
`);
        };
        this.finalizeAndMakeReadonly = async (immediatelyDeleteMessage = false) => {
            console.log(`Finalizing LFG ${this.data.id}`);
            await this.message.reactions.removeAll();
            await this.paintMessage();
            this.saveDelegate(null);
            this.dispose();
            if (immediatelyDeleteMessage) {
                await this.message.delete();
            }
            else {
                scheduleMessageDeletion(this.message.id, this.message.channel.id, Date.now() + LFG_DELETE_MESSAGE_AFTER);
            }
            console.log(`Finalized LFG ${this.data.id}`);
        };
        this.reactionDispatch = async (reaction, user, message) => {
            let playerNicks;
            playerNicks = (reaction.message.guild.member(user.id).nickname);
            //console.log("user nick: %s",playerNicks);
            let is_banned = reaction.message.guild.member(user.id).roles.cache.has(settings_1.LFGSettings.BANNED_ROLE);
            // console.log("user banned: %s",is_banned);
            if (
            // if enroll in participants
            reaction.emoji.name === constants_1.EMOJIS.white_check_mark.unicode) {
                if (is_banned)
                    return;
                this.addParticipant(user, playerNicks);
            }
            if (
            // if enroll in alternatives
            reaction.emoji.name === constants_1.EMOJIS.question.unicode) {
                if (is_banned)
                    return;
                this.addAlternative(user, playerNicks);
            }
            if (reaction.emoji.name === constants_1.EMOJIS.new.unicode) {
                if (is_banned)
                    return;
                if (this.alreadyEnrolled(user.id)) {
                    this.toggleInexperienced(user, playerNicks);
                }
                else {
                    this.toggleInexperienced(user, playerNicks, true);
                    this.addParticipant(user, playerNicks);
                }
            }
            if (reaction.emoji.name === constants_1.EMOJIS.x.unicode) {
                this.toggleInexperienced(user, playerNicks, false);
                this.removeParticipant(user.id);
            }
            await this.paintMessage();
            this.saveDelegate(this.data);
        };
        this.paintMessage = async () => {
            if (this.disposed)
                return;
            assert(this.message, 'no message found');
            const assets = settings_1.LFGAssets[this.data.activity];
            assert(assets);
            const startMoment = moment(this.data.dueDate).tz('EET');
            //  console.log("creator nick: %s",this.data.creator.nick);
            //  console.log("participant nick: %s",this.data.participants[0].nick);
            //console.log("participant1 nick: %s",this.data.participants[1].nick);
            const embed = new discord_js_1.MessageEmbed();
            embed.setColor(this.isExpired ? Color('#' + assets.color).desaturate(0.7).hex().substr(1) : assets.color);
            embed.setTimestamp(this.data.dueDate);
            for (let i in this.data.participants) {
                if (this.data.participants[i].nick)
                    this.data.participants[i].username = this.data.participants[i].nick;
            }
            for (let i in this.data.alternatives) {
                if (this.data.alternatives[i].nick)
                    this.data.alternatives[i].username = this.data.alternatives[i].nick;
            }
            if (!this.data.creator.nick) {
                embed.setFooter(`Creat de ${this.data.creator.username}`, settings_1.LFGAssets[this.data.activity].icon);
            }
            else {
                embed.setFooter(`Creat de ${this.data.creator.nick}`, settings_1.LFGAssets[this.data.activity].icon);
            }
            embed.setAuthor(assets.name, assets.icon);
            embed.setImage(this.isExpired ? assets.expiredThumbnail : assets.thumbnail);
            embed.addFields([
                {
                    "name": "Info",
                    "value": this.data.desc || '-',
                    "inline": true
                },
                {
                    "name": "ID",
                    "value": this.data.id,
                    "inline": true
                },
                { "name": constants_1.EMPTY_SPACE, "value": constants_1.EMPTY_SPACE },
                {
                    "name": "Participanti",
                    "value": this.participants.map(({ username, id }) => `${username} ${this.userNameEmojiExtensions(id)}`).join('\n') || '-',
                    "inline": true
                },
                {
                    "name": "Rezerve",
                    "value": this.alternatives.map(({ username, id }) => `${username} ${this.userNameEmojiExtensions(id)}`).join('\n') || '-',
                    "inline": true
                },
                {
                    "name": "Start [Ora RO]",
                    "value": startMoment.format("DD/MM/YYYY") + '\n' + startMoment.format('HH:mm')
                }
            ]);
            await this.message.edit({ embed });
            this.saveDelegate(this.data);
        };
        this.channel = channel;
        this.client = channel.client;
        this.data = data;
        this.saveDelegate = saveDelegate;
        this.init().catch(console.error);
    }
    get owner() {
        return this.data.creator;
    }
    get isExpired() {
        return this.data.dueDate < Date.now();
    }
    get participants() {
        return this.data.participants.slice(0, 6);
    }
    get alternatives() {
        return [...this.data.participants.slice(6), ...this.data.alternatives];
    }
    addParticipant(user, nick) {
        if (
        // not already in participants
        !this.data.participants.find(x => x.id === user.id)) {
            // remove from any other list
            this.removeParticipant(user.id);
            // add it
            this.data.participants.push({ username: user.username, id: user.id, nick: nick });
        }
    }
    addAlternative(user, nick) {
        if (
        // and not already in alternatives
        !this.data.alternatives.find(x => x.id === user.id)) {
            // remove from any other list
            this.removeParticipant(user.id);
            // add it
            this.data.alternatives.push({ username: user.username, id: user.id, nick: nick });
        }
    }
    toggleInexperienced(user, nick, bool) {
        const exists = !!this.data.inexperienced.find(x => x.id === user.id);
        if (typeof bool !== "boolean") {
            bool = !exists;
        }
        if (!bool) {
            this.data.inexperienced = this.data.inexperienced.filter(x => x.id !== user.id);
        }
        else {
            if (!exists) {
                this.data.inexperienced.push({ id: user.id, username: user.username, nick });
            }
        }
    }
    removeParticipant(id) {
        this.data.participants = this.data.participants.filter(x => x.id !== id);
        this.data.alternatives = this.data.alternatives.filter(x => x.id !== id);
    }
    alreadyEnrolled(id) {
        return (!!this.data.participants.find(x => x.id === id) ||
            !!this.data.alternatives.find(x => x.id === id));
    }
    isInexperienced(id) {
        return !!this.data.inexperienced.find(x => x.id === id);
    }
    userNameEmojiExtensions(id) {
        const ext = [];
        if (this.isInexperienced(id)) {
            ext.push(this.inexperiencedString);
        }
        if (this.owner.id === id) {
            ext.push(this.authorString);
        }
        return ext.join(' ');
    }
}
exports.LFGMessageManager = LFGMessageManager;
//# sourceMappingURL=message-manager.js.map