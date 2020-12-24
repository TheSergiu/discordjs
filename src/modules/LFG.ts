import {Client,  Message, Snowflake, TextChannel, User} from "discord.js";
import {EMOJIS, EMPTY_SPACE, timeFormatRegex} from "../helpers/constants";
import {OneReactionWaiter} from "../helpers/ReactionManager";
import {UserResponseManager} from "../helpers/UserResponseManager";
import moment = require("moment-timezone");

export enum LFGActivity {
  'dsc' = "Deep Stone Crypt",
  'garden' = 'Garden of Salvation',
  'lw' = 'Last Wish'
}

export class LFG {
  private readonly client: Client

  usersInProgress: Set<Snowflake> = new Set;

  constructor(client: Client) {
    this.client = client;
    this.client.on('message', this.dispatch);
  }

  private billboardChannelID = '787699897838993479'

  private entries: {
    [id: string]: {
      messageID: string,
      participants: string[]
      alternatives: string[],

      dueDate: number
      activity: LFGActivity
      desc?: string
    }
  } = {}

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