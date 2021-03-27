import {Client, Message, Snowflake, TextChannel, User} from "discord.js";
import {EMOJIS, EMPTY_SPACE, timeFormatRegex} from "../../helpers/constants";
import {OneReactionWaiter} from "../../helpers/ReactionManager";
import {UserResponseManager} from "../../helpers/UserResponseManager";
import {channelID2Text, isDateValid, PromiseTimeoutError, sleep, timeoutPromise, userID2Text} from "../../helpers";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {LFGMessageManager} from "./message-manager";
import {LFGActivity, LFGManagerData} from "./types";
import {LFGSettings} from "./settings";
import {CmdHelper, CommandType, DiscordInteraction} from "../../helpers/cmd-helper";
import moment = require("moment-timezone");
import assert = require("assert");
import BILLBOARD_CHANNEL_ID = LFGSettings.BILLBOARD_CHANNEL_ID;
import LFG_CREATE_TIMEOUT = LFGSettings.LFG_CREATE_TIMEOUT;
import LFGFile = LFGSettings.LFGFile;

const raidCreateCommand = new CmdHelper({
  type: CommandType.SUB_COMMAND_GROUP,
  name: `raid`,
  description: 'Organizare raiduri',
  options: [
    {
      name: 'create',
      description: 'Crează o organizare',
      type: CommandType.SUB_COMMAND,
      required: false
    },
    {
      name: 'edit',
      description: 'Editează o organizare',
      type: CommandType.SUB_COMMAND,
      required: false,

      options: [{
        type: CommandType.STRING,
        name: 'id',
        description: 'ID-ul raidului',
        required: true
      }]
    },
    {
      name: 'delete',
      description: 'Șterge o organizare',
      type: CommandType.SUB_COMMAND,
      required: false,

      options: [{
        type: CommandType.STRING,
        name: 'id',
        description: 'ID-ul raidului',
        required: true
      }]
    },
  ]
}, i => {
  console.log(i);
  return {content: EMPTY_SPACE};
});

export class LFGModule {
  private readonly client: Client
  private readonly instances = new Map<string, LFGMessageManager>();
  private readonly entries: { [id: string]: LFGManagerData } = {};

  private billboardChannel: TextChannel;

  usersInProgress: Set<Snowflake> = new Set;
  idsInProgress: Set<string> = new Set;

  constructor(client: Client) {
    this.client = client;

    this.entries = existsSync(LFGFile) ? JSON.parse(readFileSync(LFGFile).toString()) : {};

    this.client.on('message', this.dispatch);
    this.client.once('ready', this.init)

    raidCreateCommand.on('command', this.dispatchOnInteraction);
  }

  save = () => {
    writeFileSync(LFGFile, JSON.stringify(this.entries, null, 2));
  }

  saveEntry = (entryID: string, entry: LFGManagerData | null) => {
    this.entries[entryID] = entry;
    if (!entry) {
      delete this.entries[entryID];
      this.instances.delete(entryID);
    }
    this.save();
  }

  init = async () => {
    this.billboardChannel = await this.client.channels.fetch(BILLBOARD_CHANNEL_ID) as TextChannel;

    for (const key in this.entries) {
      this.instances.set(key, new LFGMessageManager(this.billboardChannel, this.entries[key], this.saveEntry.bind(this, key)));
    }

    await raidCreateCommand.ensure()
    raidCreateCommand.start()

  }

  findAvailableID = () => {

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
    throw new Error('Cannot generate more IDs')
  }


  dispatchOnInteraction = async (interaction: DiscordInteraction) => {

    assert(interaction.data.options.length === 1);
    const subcommand = interaction.data.options[0];

    // const guild = await this.client.guilds.fetch(interaction.guild_id);
    const channel: TextChannel = await this.client.channels.fetch(interaction.channel_id) as TextChannel;
    const user = await this.client.users.fetch(interaction.member.user.id);


    if (subcommand.name === 'create') {
      const myID = this.findAvailableID();
      this.usersInProgress.add(user.id);

      try {
        const data = await this.lfgRaidLifeCycle(channel, user, myID, 'create', {});

        this.entries[myID] = {
          id: myID,
          inexperienced: [],
          alternatives: [],
          participants: [{username: user.username, id: user.id}],
          dueDate: data.time.getTime(),
          desc: data.desc,
          creator: {username: user.username, id: user.id},
          activity: data.activity
        };
        this.instances.set(
          myID,
          new LFGMessageManager(
            this.billboardChannel,
            this.entries[myID],
            this.saveEntry.bind(this, myID)
          )
        );
        this.save();

      } catch (e) {
        console.error(e);
      } finally {
        this.idsInProgress.delete(myID);
        this.usersInProgress.delete(user.id);
      }
      return;
    }

    if(subcommand.name==='edit'){
      assert(subcommand.options.length===1);
      const option = subcommand.options[0];
      assert(option.name==='id');
      let id = option.value;

      id = id.padStart(4, '0');
      const instance = this.instances.get(id);
      if (!instance) {
        return await channel.send(`Organizarea [${id}] a expirat sau nu exista`);
      }
      if (instance.owner.id !== user.id) {
        return await channel.send(`Organizarea [${id}] nu a fost creata de tine`);
      }

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

      this.instances.set(
        id,
        new LFGMessageManager(
          this.billboardChannel,
          this.entries[id],
          this.saveEntry.bind(this, id)
        )
      );
      this.save();
      return ;
    }

    if(subcommand.name==='delete'){
      assert(subcommand.options.length===1);
      const option = subcommand.options[0];
      assert(option.name==='id');
      let id = option.value;

      id = id.padStart(4, '0');
      const instance = this.instances.get(id);
      if (!instance) {
        return await channel.send(`Organizarea [${id}] a expirat sau nu exista`);
      }
      if (instance.owner.id !== user.id) {
        return await channel.send(`Organizarea [${id}] nu a fost creata de tine`);
      }
      await instance.finalizeAndMakeReadonly(true);
      return await channel.send(`Organizarea [${id}] a fost stearsa`);
    }
  }


  dispatch = async (message: Message) => {
    if (message.channel.type !== 'text') return;
    if (message.author.bot) return;

    const {content, author, channel} = message;
    if (content.indexOf('/raid') !== 0) return;

    if (this.usersInProgress.has(author.id)) return;

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

      this.instances.set(
        id,
        new LFGMessageManager(
          this.billboardChannel,
          this.entries[id],
          this.saveEntry.bind(this, id)
        )
      );
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
          participants: [{username: author.username, id: author.id}],
          dueDate: data.time.getTime(),
          desc: data.desc,
          creator: {username: author.username, id: author.id},
          activity: data.activity
        };
        this.instances.set(
          myID,
          new LFGMessageManager(
            this.billboardChannel,
            this.entries[myID],
            this.saveEntry.bind(this, myID)
          )
        );
        this.save();

      } catch (e) {
        console.error(e);
      } finally {
        this.idsInProgress.delete(myID);
        this.usersInProgress.delete(author.id);
      }
    }
  }

  private lfgRaidLifeCycle = async (channel: TextChannel, user: User, id: string, type: 'create' | 'update', hints: { date?: number, desc?: string, activity?: LFGActivity }) => {
    const footer = {text: `\n\nID ${id} by ${user.username}`};

    let question: Message;

    try {
      question = await channel.send({
        embed: {
          title: 'Alege Raid',
          fields: [
            {
              name: EMPTY_SPACE,
              value: `\
${EMOJIS.D.text} Deep Stone Crypt
${EMOJIS.G.text} Garden of Salvation
${EMOJIS.L.text} Last Wish`
            },

            ...(hints.activity ? [
              {name: 'Alegerea curenta', value: hints.activity}
            ] : [])
          ],
          footer
        }
      });

      await Promise.all([
        question.react(encodeURIComponent(EMOJIS.D.unicode)),
        question.react(encodeURIComponent(EMOJIS.G.unicode)),
        question.react(encodeURIComponent(EMOJIS.L.unicode)),
      ]);

      const chooseRaidResponse = await timeoutPromise(
        new OneReactionWaiter(question, user).waitReactionAndDispose(),
        LFG_CREATE_TIMEOUT
      );

      const isDSC = chooseRaidResponse.reaction.emoji.name === EMOJIS.D.unicode;
      const isGarden = chooseRaidResponse.reaction.emoji.name === EMOJIS.G.unicode;
      const isLastWish = chooseRaidResponse.reaction.emoji.name === EMOJIS.L.unicode;

      console.log('LFG', id, 'activity', {isDSC, isGarden, isLastWish});

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

      const textResponseWaiter = new UserResponseManager(channel, user);

      let time: Date | null = null;
      while (!time) {
        const resp = await textResponseWaiter.waitResponseAndDeleteMessage(LFG_CREATE_TIMEOUT);

        console.log('LFG', id, 'time/date', 'input', resp.content);
        const content = resp.content.toString().toLowerCase().trim();

        if (timeFormatRegex.test(content)) {
          const [
            _,
            h,
            m,
            D = moment().tz('EET').format('DD'),
            M = moment().tz('EET').format('MM')
          ] = timeFormatRegex.exec(content);

          time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET', true).toDate();

          if (time && !isDateValid(time)) {
            channel.send(`Data "${content}" nu este corecta.`).then(async (m) => {
              await sleep(5000);
              return m.delete();
            }).catch(console.error);
            time = null;
          }

          if (time && time.getTime() < Date.now() - 60 * 1000) {
            channel.send('Nu poti crea o organizare in trecut.').then(async (m) => {
              await sleep(5000);
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
              name: EMPTY_SPACE,
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
        await channel.send(`Evenimentul ${id} a fost creat pe ${channelID2Text(BILLBOARD_CHANNEL_ID)} de catre ${userID2Text(user.id)}!`);
      } else {
        await channel.send(`Evenimentul ${id} a fost actualizat de catre ${userID2Text(user.id)}!`);
      }

      let activity: LFGActivity;
      if (isDSC) activity = LFGActivity.dsc;
      if (isGarden) activity = LFGActivity.garden;
      if (isLastWish) activity = LFGActivity.lw;

      return {time, id, desc, activity};

    } catch (e) {

      if (e instanceof PromiseTimeoutError) {
        console.log(`LFG Event ${id} has timed out`);
        if (type === 'create') {
          await channel.send(`Crearea evenimentului [${id}] de catre <@${user.id}> a expirat!`);
        } else {
          await channel.send(`Actualizarea evenimentului [${id}] de catre <@${user.id}> a expirat!`);
        }
      }
      throw e;

    } finally {

      await question.delete();

    }
  }
}



