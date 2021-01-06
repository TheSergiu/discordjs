import {Client, Message, Snowflake, TextChannel, User} from "discord.js";
import {EMOJIS, EMPTY_SPACE, timeFormatRegex} from "../../helpers/constants";
import {OneReactionWaiter} from "../../helpers/ReactionManager";
import {UserResponseManager} from "../../helpers/UserResponseManager";
import {channelID2Text, PromiseTimeoutError, sleep, timeoutPromise, userID2Text} from "../../helpers";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {LFGMessageManager} from "./message-manager";
import {LFGActivity, LFGManagerData} from "./types";
import {LFGSettings} from "./settings";
import moment = require("moment-timezone");
import LFGFile = LFGSettings.LFGFile;
import BILLBOARD_CHANNEL_ID = LFGSettings.BILLBOARD_CHANNEL_ID;
import LFG_CREATE_TIMEOUT = LFGSettings.LFG_CREATE_TIMEOUT;

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

    if (/^\/raid\s*$/gi.test(content)) {

      const myID = this.findAvailableID();
      this.usersInProgress.add(author.id);

      try {
        const data = await this.lfgRaidLifeCycle(channel, author, myID);

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

  private lfgRaidLifeCycle = async (channel: TextChannel, user: User, id: string) => {
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
          title: 'Alege ora si data',
          fields: [
            {
              name: 'Format',
              value: 'hh:mm DD/MM sau `now` / `acum`'
            },
            {
              name: 'Ora RO curenta (EET)',
              value: moment().tz('EET').format('HH:mm DD/MM')
            }
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

          time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET').toDate();

          if (time.getTime() < Date.now() - 60 * 1000) {
            channel.send('Nu poti crea o organizare in trecut').then(async (m) => {
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
          ],
          footer
        }
      });

      let desc = (await textResponseWaiter.waitResponseAndDeleteMessage(LFG_CREATE_TIMEOUT)).content.trim();

      if (desc.toLowerCase() === 'none' || desc.toLowerCase() === 'nimic') {
        desc = null;
      }

      console.log('LFG', id, 'desc:', desc);

      await channel.send(`Evenimentul ${id} a fost creat pe ${channelID2Text(BILLBOARD_CHANNEL_ID)} de catre ${userID2Text(user.id)}!`);

      let activity: LFGActivity;
      if (isDSC) activity = LFGActivity.dsc;
      if (isGarden) activity = LFGActivity.garden;
      if (isLastWish) activity = LFGActivity.lw;

      return {time, id, desc, activity};

    } catch (e) {

      if (e instanceof PromiseTimeoutError) {
        console.log(`LFG Event ${id} has timed out`);
        await channel.send(`Crearea evenimentului [${id}] de catre <@${user.id}> a expirat!`);
      }
      throw e;

    } finally {

      await question.delete();

    }
  }
}



