"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneReactionWaiter = exports.SimpleReactionManager = exports.MessageReactionManager = void 0;
const index_1 = require("./index");
const events_1 = require("events");
const client_1 = require("./client");
class MessageReactionManager extends events_1.EventEmitter {
    constructor(message) {
        super();
        this.dispatchReaction = async (reaction, user) => {
            await index_1.removeReactionFromMessageByUser(reaction.message, user, reaction.emoji);
            this.emit('reaction', reaction, user, reaction.message);
        };
        this.dispose = () => {
            this.collector.stop('dispose');
        };
        this.message = message;
        this.collector = message.createReactionCollector(() => true, {});
        this.collector.on("collect", this.dispatchReaction);
    }
    static async messageFromID(channelID, messageID) {
        const channel = await client_1.client.channels.fetch(channelID);
        return await channel.messages.fetch(messageID);
    }
}
exports.MessageReactionManager = MessageReactionManager;
class SimpleReactionManager extends MessageReactionManager {
    constructor(message) {
        super(message);
        this.on('reaction', (reaction, user, message1) => {
            console.log(reaction.emoji.name, user.username, message1.id);
        });
    }
}
exports.SimpleReactionManager = SimpleReactionManager;
class OneReactionWaiter extends MessageReactionManager {
    constructor(message, user) {
        super(message);
        this.waitReaction = async () => {
            return await new Promise(res => this.on("reaction", (reaction, user, message) => {
                if (user.id !== this.user.id) {
                    return;
                }
                res({ reaction, user, message });
            }));
        };
        this.waitReactionAndDispose = async () => {
            const data = await this.waitReaction();
            this.dispose();
            return data;
        };
        this.user = user;
    }
}
exports.OneReactionWaiter = OneReactionWaiter;
//# sourceMappingURL=ReactionManager.js.map