import {Client, Message, MessageEmbed, MessageReaction, Snowflake, TextChannel, User} from "discord.js";
import {EMOJIS, EMPTY_SPACE, timeFormatRegex} from "../helpers/constants";
import {MessageReactionManager, OneReactionWaiter} from "../helpers/ReactionManager";
import {UserResponseManager} from "../helpers/UserResponseManager";
import moment = require("moment-timezone");
import * as  assert from "assert";
import {repeatArray, userID2Text} from "../helpers";
import {start} from "repl";
import {existsSync, readFileSync, writeFileSync} from "fs";
import * as path from 'path';

export enum LFGActivity {
  'dsc' = "Deep Stone Crypt",
  'garden' = 'Garden of Salvation',
  'lw' = 'Last Wish'
}

const LFGFile = path.join(process.cwd(), 'db', 'lfg.json');

export class LFG {
  private readonly client: Client
  private readonly instances = new Map<string, LFGMessageManager>();
  private readonly entries: { [id: string]: LFGManagerData } = {};

  usersInProgress: Set<Snowflake> = new Set;

  constructor(client: Client) {
    this.client = client;

    this.entries = existsSync(LFGFile) ? JSON.parse(readFileSync(LFGFile).toString()) : {};

    this.client.on('message', this.dispatch);
    this.client.once('ready', this.init)
  }

  private billboardChannelID = '787699897838993479'

  save = () => {
    writeFileSync(LFGFile, JSON.stringify(this.entries, null, 2));
  }

  saveEntry = (entryID: string, entry: LFGManagerData | null) => {
    this.entries[entryID] = entry;
    if (!entry) {
      // todo remove scheduled messages
      delete this.entries[entryID];
    }
    this.save();
  }

  init = async () => {
    const channel = await this.client.channels.fetch(this.billboardChannelID) as TextChannel;

    for (const key in this.entries) {
      this.instances.set(key, new LFGMessageManager(channel, this.entries[key], this.saveEntry.bind(this, key)));
    }
  }


  dispatch = async (message: Message) => {
    if (message.channel.type !== 'text') return;
    if (message.author.bot) return;

    const {content, author, channel} = message;
    if (content.indexOf('/raid') !== 0) return;

    if (this.usersInProgress.has(author.id)) return;

    try {
      this.usersInProgress.add(author.id);
      console.log(await this.lfgRaidLifeCycle(channel, author, 0));
    } catch (e) {

    } finally {
      this.usersInProgress.delete(author.id);
    }
  }

  private lfgRaidLifeCycle = async (channel: TextChannel, user: User, id: number) => {
    const footer = {text: `\n\nID ${id} by ${user.username}`};

    const question = await channel.send({
      embed: {
        title: 'Choose Raid',
        fields: [
          {name: EMPTY_SPACE, value: EMPTY_SPACE},
          {
            name: 'Raids',
            value: `\
${EMOJIS.D.text} Deep Stone Crypt
${EMOJIS.G.text} Garden of Salvation
${EMOJIS.L.text} Last Wish`
          },
        ],
        footer
      }
    });

    await Promise.all([
      question.react(encodeURIComponent(EMOJIS.D.unicode)),
      question.react(encodeURIComponent(EMOJIS.G.unicode)),
      question.react(encodeURIComponent(EMOJIS.L.unicode)),
    ]);

    const chooseRaidResponse = await new OneReactionWaiter(question, user).waitReactionAndDispose();

    const isDSC = chooseRaidResponse.reaction.emoji.name === EMOJIS.D.unicode;
    const isGarden = chooseRaidResponse.reaction.emoji.name === EMOJIS.G.unicode;
    const isLastWish = chooseRaidResponse.reaction.emoji.name === EMOJIS.L.unicode;

    console.log({isDSC, isGarden, isLastWish});

    await question.reactions.removeAll();
    await question.edit({
      embed: {
        title: 'Choose time/date',
        fields: [
          {
            name: 'Format',
            value: 'hh:mm DD/MM or `now`'
          },
          {
            name: 'Current time [RO]',
            value: moment().tz('EET').format('HH:mm DD/MM')
          }
        ],
        footer
      }
    });

    const textResponseWaiter = new UserResponseManager(channel, user);

    let time: Date | null = null;
    while (!time) {
      const resp = await textResponseWaiter.waitResponseAndDeleteMessage();
      console.log(resp.content);
      const content = resp.content.toString().toLowerCase().trim();

      if (timeFormatRegex.test(content)) {
        const [
          _,
          h,
          m,
          D = moment().tz('EET').format('DD'),
          M = moment().tz('EET').format('MM')
        ] = timeFormatRegex.exec(content);

        time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET').toDate();
      }

      if (content === 'now') {
        time = new Date();
      }
    }

    console.log(time);

    await question.edit({
      embed: {
        title: 'Description',
        fields: [
          {
            name: EMPTY_SPACE,
            value: 'Write an optional description or `none`'
          },
        ],
        footer
      }
    });

    let desc = (await textResponseWaiter.waitResponseAndDeleteMessage()).content.trim();
    if (desc.toLowerCase() === 'none') {
      desc = null;
    }
    console.log(desc);

    await question.delete();
    await channel.send(`Event ${id} created by <@${user.id}>!`);

    return {time, id, desc, raid: {isDSC, isGarden, isLastWish}};
  }
}

type LFGManagerData = {
  id: string,
  messageID?: Snowflake
  creator: { username: string, id: Snowflake }
  participants: { username: string, id: Snowflake }[]
  alternatives: { username: string, id: Snowflake }[]
  inexperienced: { username: string, id: Snowflake }[]

  dueDate: number,
  activity: LFGActivity,
  desc?: string
}

const LFGAssets: {
  [id in LFGActivity]: {
    color: string,
    name: string,
    icon: string,
    thumbnail: string
  }
} = {
  [LFGActivity.lw]: {
    name: "Last Wish",
    color: '9400b5',
    icon: "https://cdn.discordapp.com/attachments/610559032943444132/787730695161118730/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/782729652526776380/787734420446642226/last-wish-2.png'
  },

  [LFGActivity.garden]: {
    name: 'Garden Of Salvation',
    color: 'fab75f',
    icon: "https://cdn.discordapp.com/attachments/610559032943444132/787730695161118730/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679452687237190/garden.jpg'
  },

  [LFGActivity.dsc]: {
    name: "Deep Stone Crypt",
    color: '4287f5',
    icon: "https://cdn.discordapp.com/attachments/610559032943444132/787730695161118730/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679459305848892/dsc.jpg'
  },
}

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
