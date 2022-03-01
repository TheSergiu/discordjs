"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapObj = exports.values = exports.keys = exports.isDateValid = exports.timeoutPromise = exports.PromiseTimeoutError = exports.sleep = exports.repeatArray = exports.message2link = exports.roleID2Text = exports.channelID2Text = exports.userID2Text = exports.emoji2react = exports.ensureReaction = exports.userReacted = exports.removeReactionFromMessageByUser = exports.sendMessage = exports.maxCharPerMessage = exports.text2codeBlock = exports.splitOnFirst = void 0;
function splitOnFirst(s, delimiter) {
    const [a, ...b] = s.split(delimiter);
    return [a, b ? b.join(delimiter) : undefined];
}
exports.splitOnFirst = splitOnFirst;
function text2codeBlock(s) {
    if (s.indexOf('`') === -1) {
        if (s.indexOf('\n') !== -1) {
            return `\`\`\`${s}\`\`\``;
        }
        else {
            return `\`${s}\``;
        }
    }
    if (/```([^`]*)?```/gi.test(s)) {
        if (/^```/.test(s) && /```$/.test(s)) {
            return s;
        }
        s = s.replace(/`/g, '\'');
        return `\`\`\`${s}\`\`\``;
    }
    return `\`\`\`${s.replace(/`/g, '')}\`\`\``;
}
exports.text2codeBlock = text2codeBlock;
function maxCharPerMessage(s) {
    if (typeof s === "string") {
        s = s.split('\n');
    }
    const messages = [[]];
    const MAX = 1950;
    let lastEntryLen = 0;
    while (s.length) {
        const line = s.splice(0, 1)[0];
        if (lastEntryLen + line.length > MAX) {
            messages.push([]);
            lastEntryLen = 0;
        }
        lastEntryLen += line.length;
        messages[messages.length - 1].push(line);
    }
    return messages;
}
exports.maxCharPerMessage = maxCharPerMessage;
async function sendMessage(s, channel) {
    const messages = maxCharPerMessage(s);
    for (let i = 0; i < messages.length; i++) {
        await channel.send({
            content: messages[i].join('\n'),
            split: {
                char: '\n',
                maxLength: 1950
            }
        });
    }
}
exports.sendMessage = sendMessage;
async function removeReactionFromMessageByUser(message, userOrID, emojiFilter) {
    const userId = typeof userOrID === "string" ? userOrID : userOrID.id;
    const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(userId));
    await Promise.all([...userReactions.values()].map(async (reaction) => {
        if (emojiFilter) {
            if (emojiFilter.name && emojiFilter.name !== reaction.emoji.name) {
                return;
            }
            if (emojiFilter.id && emojiFilter.id !== reaction.emoji.id) {
                return;
            }
        }
        await reaction.users.remove(userId);
    }));
}
exports.removeReactionFromMessageByUser = removeReactionFromMessageByUser;
async function userReacted(message, userOrID, emojiFilter) {
    const userId = typeof userOrID === "string" ? userOrID : userOrID.id;
    const userReactions = message.reactions.cache.filter(reaction => (reaction.users.cache.has(userId) &&
        (reaction.emoji.name === emojiFilter.name ||
            reaction.emoji.id === emojiFilter.id)));
    return userReactions.size > 0;
}
exports.userReacted = userReacted;
async function ensureReaction(message, user, react) {
    if (await userReacted(message, user, { name: typeof react === "string" ? react : react.name })) {
        return;
    }
    await message.react(typeof react === "string" ? encodeURIComponent(react) : react);
}
exports.ensureReaction = ensureReaction;
function emoji2react(emojiName) {
    return encodeURIComponent(`:${emojiName}:`);
}
exports.emoji2react = emoji2react;
const userID2Text = (userID) => {
    return `<@${userID}>`;
};
exports.userID2Text = userID2Text;
const channelID2Text = (channelID) => {
    return `<#${channelID}>`;
};
exports.channelID2Text = channelID2Text;
const roleID2Text = (roleID) => {
    return `<@&${roleID}>`;
};
exports.roleID2Text = roleID2Text;
const message2link = (message) => {
    return `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
};
exports.message2link = message2link;
function repeatArray(arr, times) {
    let out = arr;
    for (let i = 1; i < times; i++) {
        out = out.concat(arr);
    }
    return out;
}
exports.repeatArray = repeatArray;
function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}
exports.sleep = sleep;
class PromiseTimeoutError extends Error {
}
exports.PromiseTimeoutError = PromiseTimeoutError;
function timeoutPromise(p, ms) {
    return Promise.race([
        p,
        sleep(ms).then(() => {
            throw new PromiseTimeoutError();
        })
    ]);
}
exports.timeoutPromise = timeoutPromise;
function isDateValid(date) {
    return !isNaN(date.getDate());
}
exports.isDateValid = isDateValid;
function keys(obj) {
    return Object.keys(obj);
}
exports.keys = keys;
function values(obj) {
    return keys(obj).map(k => obj[k]);
}
exports.values = values;
function mapObj(obj) {
    return keys(obj).map(k => [k, obj[k]]);
}
exports.mapObj = mapObj;
//# sourceMappingURL=index.js.map