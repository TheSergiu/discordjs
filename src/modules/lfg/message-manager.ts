import {Client, Message, MessageEmbed, MessageReaction, Snowflake, TextChannel, User} from "discord.js";
import {MessageReactionManager} from "../../helpers/ReactionManager";
import {EMOJIS, EMPTY_SPACE} from "../../helpers/constants";
import * as assert from "assert";
import {LFGManagerData} from "./types";
import {LFGAssets} from "./settings";
import moment = require("moment-timezone");

export class LFGMessageManager {
  private readonly channel: TextChannel;
  private readonly client: Client;
  private readonly data: LFGManagerData;
  private readonly saveDelegate: (e: LFGManagerData) => void;

  private message: Message;
  private reactionManager: MessageReactionManager;

  private inexperiencedString = `${EMOJIS.baby_bottle.text}`

  constructor(channel: TextChannel, data: LFGManagerData, saveDelegate: (e: LFGManagerData) => void) {
    this.channel = channel;
    this.client = channel.client;
    this.data = data;

    this.saveDelegate = saveDelegate;
    this.init().catch(console.error);
  }

  dispose = () => {
    console.log(`Disposed LFG ${this.data.id}`)
    this.reactionManager?.dispose();
  }

  async init() {
    const isNewMessage = !this.data.messageID;
    if (isNewMessage) {
      this.message = await this.channel.send({embed: {title: 'Pending LFG...'}});
    } else {
      try {
        this.message = await this.channel.messages.fetch(this.data.messageID);
      } catch (e) {
        this.saveDelegate(null);
        throw e;
      }
    }
    this.data.messageID = this.message.id;
    this.client.on('messageDelete', args => {
      if (args.id === this.data.messageID) {
        console.log(`Deleted LFG message for entry ${this.data.id}`)
        this.saveDelegate(null);
        this.dispose();
      }
    })

    await this.paintMessage();

    if (isNewMessage) {
      await Promise.all([
        this.message.react(encodeURIComponent(EMOJIS.white_check_mark.unicode)),
        this.message.react(encodeURIComponent(EMOJIS.new.unicode)),
        this.message.react(encodeURIComponent(EMOJIS.x.unicode)),
        this.message.react(encodeURIComponent(EMOJIS.question.unicode)),
      ]);
    }

    this.reactionManager = new MessageReactionManager(this.message);
    this.reactionManager.on('reaction', this.reactionDispatch);
  }

  get participants() {
    return this.data.participants.slice(0, 6);
  }

  get alternatives() {
    return [...this.data.participants.slice(6), ...this.data.alternatives].slice(0, 5);
  }

  private reactionDispatch = async (reaction: MessageReaction, user: User, message: Message) => {
    if (
      // if enroll in participants
      reaction.emoji.name === EMOJIS.white_check_mark.unicode
    ) {
      this.addParticipant(user);
    }
    if (
      // if enroll in alternatives
      reaction.emoji.name === EMOJIS.question.unicode
    ) {
      this.addAlternative(user);
    }

    if (reaction.emoji.name === EMOJIS.new.unicode) {
      if (this.alreadyEnrolled(user.id)) {
        this.toggleInexperienced(user);
      } else {
        this.toggleInexperienced(user, true);
        this.addParticipant(user);
      }
    }

    if (reaction.emoji.name === EMOJIS.x.unicode) {
      this.toggleInexperienced(user, false);
      this.removeParticipant(user.id);
    }

    await this.paintMessage();
    this.saveDelegate(this.data);
  }

  private addParticipant(user: User) {
    if (
      // not already in participants
      !this.data.participants.find(x => x.id === user.id)
    ) {
      // remove from any other list
      this.removeParticipant(user.id);
      // add it
      this.data.participants.push({username: user.username, id: user.id});
    }
  }

  private addAlternative(user: User) {
    if (
      // and not already in alternatives
      !this.data.alternatives.find(x => x.id === user.id)
    ) {
      // remove from any other list
      this.removeParticipant(user.id);
      // add it
      this.data.alternatives.push({username: user.username, id: user.id});
    }
  }

  private toggleInexperienced(user: User, bool?: boolean) {
    const exists = !!this.data.inexperienced.find(x => x.id === user.id);

    if (typeof bool !== "boolean") {
      bool = !exists;
    }

    if (!bool) {
      this.data.inexperienced = this.data.inexperienced.filter(x => x.id !== user.id);
    } else {
      if (!exists) {
        this.data.inexperienced.push({id: user.id, username: user.username});
      }
    }
  }

  private removeParticipant(id: Snowflake) {
    this.data.participants = this.data.participants.filter(x => x.id !== id);
    this.data.alternatives = this.data.alternatives.filter(x => x.id !== id);
  }

  alreadyEnrolled(id: Snowflake) {
    return (
      !!this.data.participants.find(x => x.id === id) ||
      !!this.data.alternatives.find(x => x.id === id)
    )
  }

  isInexperienced(id: Snowflake) {
    return !!this.data.inexperienced.find(x => x.id === id);
  }

  private paintMessage = async () => {
    assert(this.message, 'no message found');

    const assets = LFGAssets[this.data.activity];
    assert(assets);

    const startMoment = moment(this.data.dueDate).tz('EET');

    const embed = new MessageEmbed();
    embed.setColor(assets.color);
    embed.setTimestamp(this.data.dueDate);
    embed.setFooter(
      `Creat de ${this.data.creator.username}`,
      'https://cdn.discordapp.com/attachments/610559032943444132/787730695161118730/raid.png'
    );
    embed.setAuthor(assets.name, assets.icon);
    embed.setImage(assets.thumbnail);
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
      {"name": EMPTY_SPACE, "value": EMPTY_SPACE},
      {
        "name": "Participanti",
        "value": this.participants.map(({
                                          username,
                                          id
                                        }) => `${username} ${this.isInexperienced(id) ? this.inexperiencedString : ''}`).join('\n') || '-',
        "inline": true
      },
      {
        "name": "Rezerve",
        "value": this.alternatives.map(({
                                          username,
                                          id
                                        }) => `${username} ${this.isInexperienced(id) ? this.inexperiencedString : ''}`).join('\n') || '-',
        "inline": true
      },
      {
        "name": "Start",
        "value": startMoment.format("DD/MM/YYYY") + '\n' + startMoment.format('HH:mm')
      }
    ]);

    await this.message.edit({embed});

    this.saveDelegate(this.data);
  }
}