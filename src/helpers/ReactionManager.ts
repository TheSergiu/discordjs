import {Message, MessageReaction, ReactionCollector, ReactionManager, Snowflake, TextChannel, User} from "discord.js";
import {removeReactionFromMessageByUser} from "./index";
import {EventEmitter} from "events";
import {client} from "./client";

export interface MessageReactionManager extends EventEmitter {
  on(event: 'reaction', listener: (reaction: MessageReaction, user: User, message: Message) => void): this;

  once(event: 'reaction', listener: (reaction: MessageReaction, user: User, message: Message) => void): this;
}

export class MessageReactionManager extends EventEmitter {

  protected readonly message: Message
  protected readonly collector: ReactionCollector;

  constructor(message: Message) {
    super();

    this.message = message;

    this.collector = message.createReactionCollector(() => true, {});

    this.collector.on("collect", this.dispatchReaction)
  }

  static async messageFromID(channelID: Snowflake, messageID: Snowflake) {
    const channel: TextChannel = await client.channels.fetch(channelID) as TextChannel;
    return await channel.messages.fetch(messageID);
  }

  private dispatchReaction = async (reaction: MessageReaction, user: User) => {

    await removeReactionFromMessageByUser(reaction.message, user, reaction.emoji);

    this.emit('reaction', reaction, user, reaction.message);
  }

  dispose = () => {
    this.collector.stop('dispose');
  }
}

export class SimpleReactionManager extends MessageReactionManager {
  constructor(message: Message) {
    super(message);

    this.on('reaction', (reaction, user, message1) => {
      console.log(reaction.emoji.name, user.username, message1.id)
    })
  }
}

export class OneReactionWaiter extends MessageReactionManager {
  private user: User;

  constructor(message: Message, user: User) {
    super(message);
    this.user = user;
  }

  waitReaction = async () => {
    return await new Promise<{ reaction: MessageReaction, user: User, message: Message }>(res =>
      this.on("reaction", (reaction, user, message) => {
        if (user.id !== this.user.id) {
          return;
        }

        res({reaction, user, message});
      })
    );
  }

  waitReactionAndDispose = async () => {
    const data = await this.waitReaction();
    this.dispose();
    return data;
  }
}