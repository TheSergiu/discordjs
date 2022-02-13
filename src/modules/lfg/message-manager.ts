import {Client, Message, MessageEmbed, MessageReaction, Snowflake, TextChannel, User,Guild} from "discord.js";
import {MessageReactionManager} from "../../helpers/ReactionManager";
import {EMOJIS, EMPTY_SPACE} from "../../helpers/constants";
import * as assert from "assert";
import {LFGActivity, LFGManagerData} from "./types";
import {LFGAssets, LFGSettings} from "./settings";
import {roleID2Text, userID2Text} from "../../helpers";
import {ScheduleTask} from "../../helpers/scheduler";
import {CleanUp} from "../../helpers/cleanup";
import moment = require("moment-timezone");
import Color = require("color");
import ROLE_TO_NOTIFY_ID = LFGSettings.ROLE_TO_NOTIFY_ID;
import scheduleMessageDeletion = CleanUp.scheduleMessageDeletion;
import LFG_DELETE_MESSAGE_AFTER = LFGSettings.LFG_DELETE_MESSAGE_AFTER;
import {client} from "../../helpers/client";

export class LFGMessageManager {
  private readonly channel: TextChannel;
  private readonly client: Client;
  private readonly data: LFGManagerData;
  private saveDelegate: (e: LFGManagerData) => void;

  private notifyChannel: TextChannel;

  private message: Message;
  private reactionManager: MessageReactionManager;

  private inexperiencedString = `${EMOJIS.baby_bottle.text}`;
  private authorString = `${EMOJIS.crown.text}`;

  private scheduledJobs: ScheduleTask[] = [];

  private disposed = false;

  constructor(channel: TextChannel, data: LFGManagerData, saveDelegate: (e: LFGManagerData) => void) {
    this.channel = channel;
    this.client = channel.client;
    this.data = data;

    this.saveDelegate = saveDelegate;
    this.init().catch(console.error);
  }

  dispose = () => {
    if (this.disposed) return console.warn(`LFG Instance ${this.data.id} already disposed`);

    console.log(`Disposed LFG ${this.data.id}`)
    this.reactionManager?.dispose();

    for (const job of this.scheduledJobs) {
      job.cancel();
    }
    this.disposed = true;
    this.saveDelegate = () => console.warn(`Tried to save data for LFG ${this.data.id} after it's disposal`);
  }

  init = async () => {
    const isNewMessage = !this.data.messageID;
    if (isNewMessage) {
      this.message = await this.channel.send({
        embed: {title: `Organizare noua de ${LFGAssets[this.data.activity].name}`},
        content: `${roleID2Text(ROLE_TO_NOTIFY_ID)} - Organizare noua de ${LFGAssets[this.data.activity].name}`
      });
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

    // repaint after 10 seconds
    // sometimes the first paint fails???
    setTimeout(this.paintMessage, 10 * 1000);

    if (isNewMessage) {
      await Promise.all([
        this.message.react(encodeURIComponent(EMOJIS.white_check_mark.unicode)),
        this.data.activity !== LFGActivity.all ?
          this.message.react(encodeURIComponent(EMOJIS.new.unicode))
          : null,
        this.message.react(encodeURIComponent(EMOJIS.x.unicode)),
        this.message.react(encodeURIComponent(EMOJIS.question.unicode)),
      ]);
    }

    this.reactionManager = new MessageReactionManager(this.message);
    this.reactionManager.on('reaction', this.reactionDispatch);

    this.notifyChannel = await this.client.channels.fetch(LFGSettings.CHANNEL_TO_NOTIFY_ID) as TextChannel;

    const timeLeft = this.data.dueDate - Date.now();

    if (timeLeft > 0) {
      if (timeLeft > 60 * 60 * 1000) {
        this.scheduledJobs.push(new ScheduleTask(this.data.dueDate - 60 * 60 * 1000, this.notify))
      }

      if (timeLeft < 60 * 60 * 1000 && timeLeft > 10 * 60 * 1000) {
        this.scheduledJobs.push(new ScheduleTask(Date.now() + 1000, this.notify));
      }

      if (timeLeft > 10 * 60 * 1000) {
        this.scheduledJobs.push(new ScheduleTask(this.data.dueDate - 10 * 60 * 1000 - 1000, this.notify));
      }

      if (timeLeft < 10 * 60 * 1000 && timeLeft > 5 * 60 * 1000) {
        this.scheduledJobs.push(new ScheduleTask(Date.now() + 1000, this.notify));
      }

      this.scheduledJobs.push(new ScheduleTask(this.data.dueDate, this.finalizeAndMakeReadonly));
    } else {
      await this.finalizeAndMakeReadonly();
    }

  }

  notify = async () => {
    const timeLeft = moment(this.data.dueDate, undefined, 'ro').tz('EET');
    const diff = moment(this.data.dueDate - Date.now()).tz('UTC');
    let singular = (
      (diff.dayOfYear() - 1 === 1) ||
      (diff.dayOfYear() - 1 === 0 && diff.hours() === 1) ||
      (diff.dayOfYear() - 1 === 0 && diff.hours() === 0 && diff.minutes() === 1)
    );

    const timeLeftString = timeLeft.fromNow(true);

    if (!singular && (timeLeftString === 'o oră' || timeLeftString === 'o ora')) {
      console.warn('failed to set singular properly', {
        dayOfYear: diff.dayOfYear(),
        hours: diff.hours(),
        minutes: diff.minutes(),
        diff: this.data.dueDate - Date.now()
      });
      singular = true;
    }

    console.log('LFG', this.data.id, 'notifying', timeLeftString);

    await this.notifyChannel.send(
      `\
${singular ? 'A' : 'Au'} mai ramas ${timeLeftString} pana la organizarea de ${LFGAssets[this.data.activity].name} [${this.data.id}]
Participanti: ${this.participants.map(x => userID2Text(x.id)).join(', ') || '-'}
Rezerve: ${this.alternatives.map(x => userID2Text(x.id)).join(', ') || '-'}
`
    );
  }

  finalizeAndMakeReadonly = async (immediatelyDeleteMessage = false) => {
    console.log(`Finalizing LFG ${this.data.id}`);
    await this.message.reactions.removeAll();
    await this.paintMessage();

    this.saveDelegate(null);
    this.dispose();
    if (immediatelyDeleteMessage) {
      await this.message.delete();
    } else {
      scheduleMessageDeletion(this.message.id, this.message.channel.id, Date.now() + LFG_DELETE_MESSAGE_AFTER);
    }
    console.log(`Finalized LFG ${this.data.id}`);
  }

  get owner() {
    return this.data.creator;
  }

  get isExpired() {
    return this.data.dueDate < Date.now();
  }

  get participants() {
    return this.data.participants.slice(0, 6);
  }

  get alternatives() {
    return [...this.data.participants.slice(6), ...this.data.alternatives];
  }

  private reactionDispatch = async (reaction: MessageReaction, user: User, message: Message) => {
      let playerNicks: string;
      playerNicks=(reaction.message.guild.member(user.id).nickname);
   
      //console.log("user nick: %s",playerNicks);
      let is_banned = reaction.message.guild.member(user.id).roles.cache.has(LFGSettings.BANNED_ROLE);
     // console.log("user banned: %s",is_banned);
      
    if (
      // if enroll in participants
      reaction.emoji.name === EMOJIS.white_check_mark.unicode
    ) {
      
      if(is_banned)return;
      this.addParticipant(user,playerNicks);
    }
    if (
      // if enroll in alternatives
      reaction.emoji.name === EMOJIS.question.unicode
    ) {
      if(is_banned)return;
      this.addAlternative(user,playerNicks);
    }

    if (reaction.emoji.name === EMOJIS.new.unicode) {
      if(is_banned)return;
      if (this.alreadyEnrolled(user.id)) {
        this.toggleInexperienced(user,playerNicks);
      } else {
        this.toggleInexperienced(user,playerNicks, true);
        this.addParticipant(user,playerNicks);
      }
    }

    if (reaction.emoji.name === EMOJIS.x.unicode) {
      this.toggleInexperienced(user,playerNicks, false);
      this.removeParticipant(user.id);
    }

    await this.paintMessage();
    this.saveDelegate(this.data);
  }

  private addParticipant(user: User, nick: string) {
    if (
      // not already in participants
      !this.data.participants.find(x => x.id === user.id)
    ) {
      // remove from any other list
      this.removeParticipant(user.id);
      // add it
      this.data.participants.push({username: user.username, id: user.id, nick:nick});
    }
  }

  private addAlternative(user: User, nick: string) {
    if (
      // and not already in alternatives
      !this.data.alternatives.find(x => x.id === user.id)
    ) {
      // remove from any other list
      this.removeParticipant(user.id);
      // add it
      this.data.alternatives.push({username: user.username, id: user.id,nick:nick});
    }
  }

  private toggleInexperienced(user: User, nick: string, bool?: boolean) {
    const exists = !!this.data.inexperienced.find(x => x.id === user.id);

    if (typeof bool !== "boolean") {
      bool = !exists;
    }

    if (!bool) {
      this.data.inexperienced = this.data.inexperienced.filter(x => x.id !== user.id);
    } else {
      if (!exists) {
        this.data.inexperienced.push({id: user.id, username: user.username,nick});
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

  userNameEmojiExtensions(id: Snowflake) {
    const ext: string[] = [];
    if (this.isInexperienced(id)) {
      ext.push(this.inexperiencedString)
    }
    if (this.owner.id === id) {
      ext.push(this.authorString);
    }

    return ext.join(' ');
  }

  private paintMessage = async () => {
    if (this.disposed) return;

    assert(this.message, 'no message found');

    const assets = LFGAssets[this.data.activity];
    assert(assets);

    const startMoment = moment(this.data.dueDate).tz('EET');
  //  console.log("creator nick: %s",this.data.creator.nick);
  //  console.log("participant nick: %s",this.data.participants[0].nick);
    //console.log("participant1 nick: %s",this.data.participants[1].nick);

    const embed = new MessageEmbed();
    embed.setColor(this.isExpired ? Color('#' + assets.color).desaturate(0.7).hex().substr(1) : assets.color);
    embed.setTimestamp(this.data.dueDate);
    for(let i in this.data.participants){
      if(this.data.participants[i].nick) this.data.participants[i].username = this.data.participants[i].nick;
    }

    for(let i in this.data.alternatives){
      if(this.data.alternatives[i].nick) this.data.alternatives[i].username = this.data.alternatives[i].nick;
    }

    if(!this.data.creator.nick){
      embed.setFooter(
        `Creat de ${this.data.creator.username}`,
        LFGAssets[this.data.activity].icon
      );
    }else{
      embed.setFooter(
        `Creat de ${this.data.creator.nick}`,
        LFGAssets[this.data.activity].icon
      );
    }
    embed.setAuthor(assets.name, assets.icon);
    embed.setImage(this.isExpired ? assets.expiredThumbnail : assets.thumbnail);
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
                                        }) => `${username} ${this.userNameEmojiExtensions(id)}`).join('\n') || '-',
        "inline": true
      },
      {
        "name": "Rezerve",
        "value": this.alternatives.map(({
                                          username,
                                          id
                                        }) => `${username} ${this.userNameEmojiExtensions(id)}`).join('\n') || '-',
        "inline": true
      },
      {
        "name": "Start [Ora RO]",
        "value": startMoment.format("DD/MM/YYYY") + '\n' + startMoment.format('HH:mm')
      }
    ]);

    await this.message.edit({embed});

    this.saveDelegate(this.data);
  }
}