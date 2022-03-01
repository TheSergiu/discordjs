"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LfgNotify = void 0;
class LfgNotify {
    constructor(client) {
        this.dispatch = async (message) => {
            if (message.channel.type !== 'text')
                return;
            if (!message.author.bot)
                return;
            if (message.channel.name === '🔋bot-commands') {
                //LFG Post: 3487 created.
                if (/LFG Post: \*\*([0-9]+)\*\* created/i.test(message.content)) {
                    console.group("LFG Notify");
                    console.log('Trigger LFG post!');
                    const orgChannel = this.client.channels.cache.find(channel => channel.type === 'text' &&
                        channel.name === '🎲organizari');
                    console.log('Channel 🎲organizari:', orgChannel.id);
                    const rolID = message.guild.roles.cache.find(role => role.name === 'Destiny');
                    console.log('Will notify "Destiny":', rolID.id);
                    const notifyChannel = this.client.channels.cache.find(channel => channel.type === 'text' &&
                        channel.name === '📝general');
                    console.log('Channel 📝general:', notifyChannel.id);
                    try {
                        await notifyChannel
                            .send(`<@&${rolID.id}> S-a creat o noua organizare, verificati canalul <#${orgChannel.id}>`);
                        console.log('Posted lfg announcement for', message.content);
                    }
                    catch (e) {
                        console.error(e);
                    }
                    console.groupEnd();
                }
            }
        };
        this.client = client;
        this.client.on('message', this.dispatch);
    }
}
exports.LfgNotify = LfgNotify;
//# sourceMappingURL=lfgNotify.js.map