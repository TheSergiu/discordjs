import {Client, Message, TextChannel} from "discord.js";

export class LfgNotify {
  client: Client;

  constructor(client: Client) {
    this.client = client;
    this.client.on('message', this.dispatch);
  }

  dispatch = async (message: Message) => {
    if (message.channel.type !== 'text') return;
    if (!message.author.bot) return;

    if (message.channel.name === '🚨lfg-events🚨') {

      //LFG Post: 3487 created.
      if (/LFG Post: \*\*([0-9]+)\*\* created/i.test(message.content)) {
        console.group("LFG Notify");
        console.log('Trigger LFG post!');

        const orgChannel = this.client.channels.cache.find(channel =>
          channel.type === 'text' &&
          (channel as TextChannel).name === '🚨lfg-events🚨'
        );
        console.log('Channel 🚨lfg-events🚨:', orgChannel.id);

        const rolID = message.guild.roles.cache.find(role => role.name === '🔰Destiny 2');
        console.log('Will notify "Destiny":', rolID.id);

        const notifyChannel: TextChannel = this.client.channels.cache.find(channel =>
          channel.type === 'text' &&
          (channel as TextChannel).name === '💬chat-lfg💬'
        ) as TextChannel;

        console.log('Channel 💬chat-lfg💬:', notifyChannel.id);
        try {
          await notifyChannel
            .send(`<@&${rolID.id}> S-a creat o noua organizare, verificati canalul <#${orgChannel.id}>`);
          console.log('Posted lfg announcement for', message.content);
        } catch (e) {
          console.error(e);
        }
        console.groupEnd();
      }
    }
  }
}
