import * as path from 'path';
import {existsSync, readFileSync, writeFileSync} from "fs";
import {Client, GuildMember, Message, Role} from "discord.js";
import {canEditCommands, canBan, settings, withPrefix, BanData,jsonBanData} from "../settings";
import {maxCharPerMessage, sendMessage, splitOnFirst, text2codeBlock} from "../helpers";
import {ScheduleTask} from "../helpers/scheduler";
import {LFGSettings} from "../modules/lfg/settings";
import * as pad from 'pad';
import {EMOJIS, EMPTY_SPACE, timeFormatRegex, dataFormatRegex} from "../helpers/constants";
import moment = require("moment-timezone");
import assert = require("assert");
import {
  channelID2Text,
  isDateValid,
  keys, mapObj,
  PromiseTimeoutError,
  sleep,
  timeoutPromise,
  userID2Text, values
} from "../helpers";

const CREATE_COMMAND = 'create';
const EDIT_COMMAND = 'edit';
const DEL_COMMAND = 'del';
const COMMANDS_COMMAND = 'commands';
const HELP_COMMAND = 'help';
const BAN_COMMAND = 'raid-ban';
const BAN_LIST = 'ban-list';
const UNBAN_COMMAND = "raid-unban"

const commandsDbPath = path.join(process.cwd(), 'db', 'commands.json');
const BAN_file = path.join(process.cwd(), 'db', 'banned.json');

export class Commands {
  db: ({ [s: string]: string }) = {};
  
  client: Client

  private scheduledJobs: ScheduleTask[] = [];
  private BanList: BanData[] = [];
  dbBan: ({ [banned_user: string]: jsonBanData }) = {};


  constructor(client: Client) {
    this.load();
    this.loadBans();
    this.client = client;
    this.client.on('message', this.dispatch);
    client.user?.setActivity(withPrefix(HELP_COMMAND), {type: "PLAYING"}).catch(console.error);
    
    //console.log('reading data: %s',this.dbBan);
    //console.log('writing data: %s',this.db);



  }

  save = () => {
    writeFileSync(commandsDbPath, JSON.stringify(this.db, null, 2));
  }

  save_bans = () => {
    console.log('writing to file: %s',BAN_file);
    writeFileSync(BAN_file, JSON.stringify(this.dbBan, null, 2));
    console.log('writing data: %s',this.dbBan);
  }

  load = () => {
    this.db = JSON.parse(readFileSync(commandsDbPath).toString());
  }

  loadBans = () => {
    this.dbBan = existsSync(BAN_file) ? JSON.parse(readFileSync(BAN_file).toString()) : {};
    var bans: jsonBanData;
    var bans_local: BanData;
    let zi: Date;
    for (const key in this.dbBan) {
      bans = this.dbBan[key];
      zi = new Date(bans.dueDate);
      bans_local = {guild_id: bans.guild_id,id_banned_by:bans.id_banned_by,id_banned_user: bans.id_banned_user,dueDate:zi,banned_by:bans.banned_by,banned_user:bans.banned_user};
      this.BanList.push(bans_local); 
      this.scheduledJobs.push(new ScheduleTask(bans_local.dueDate, this.notify))
      //console.log('ban data %s',bans_local.dueDate.getDate());
    }
    //this.notify();

  }

  sendNoPerms = (message: Message) => {
    return message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
  }

  sendNoPermsBAN = (message: Message) => {
    return message.channel.send('Nu ai rolul necesar pentru a bana un user');
  }

  dispatch = (message: Message) => {
    if (message.channel.type !== 'text') return;
    if (message.author.bot) return;

    const {member} = message;

    if (!member) {
      return console.warn('no member for message', message);
    }


    const [command, commandMessage] = splitOnFirst(message.content, " ");

    if (command === withPrefix(CREATE_COMMAND)) {
      return this.setCommand(commandMessage ?? '', message, member, 'create');
    }

    if (command === withPrefix(EDIT_COMMAND)) {
      return this.setCommand(commandMessage ?? '', message, member, 'edit');
    }
    if (command === withPrefix(DEL_COMMAND)) {
      return this.delCommand(commandMessage ?? '', message, member);
    }

    if (command === withPrefix(HELP_COMMAND) || command === withPrefix(COMMANDS_COMMAND)) {
      return this.listCommands(message, member);
    }

    if (command === withPrefix(BAN_COMMAND)) {
      return this.BAN_user(commandMessage ?? '', message, member);
    }

    if (command === withPrefix(UNBAN_COMMAND)) {
      return this.UNBAN_user(commandMessage ?? '', message, member);
    }

    if (command === withPrefix(BAN_LIST)) {
      return this.listBAN(commandMessage ?? '', message, member);
    }

    return this.sendMessageIfCommand(message);
  }
  notify = async () => {
    if (!this.client) {
      console.log('wating for client to be ready for unban');
      this.scheduledJobs.push(new ScheduleTask(Date.now()+5000, this.notify))
    }

    for(const entry of this.BanList){
      
      if(entry.dueDate && entry.dueDate.getTime() < Date.now()){
        console.log('user unbanned %s',entry);
        const idx = this.BanList.indexOf(entry);
        delete this.dbBan[entry.id_banned_user];
        this.BanList.splice(idx,1);
        
        //todo:remove role

      const guild = this.client.guilds.cache.get(entry.guild_id);   // copy the id of the server your bot is in and paste it in place of guild-ID.
      const role = guild.roles.cache.get(LFGSettings.BANNED_ROLE);  // here we are getting the role object using the id of that role.
      const member =  await guild.members.fetch(entry.id_banned_user); // here we are getting the member object using the id of that member. This is the member we will add the role to.
      member.roles.remove(role);   // here we just added the role to the member we got.

      }else{
        console.log('user still banned %s',entry);
      }

    }
    this.save_bans();
  }
  UNBAN_user = async(text: string, message: Message, member: GuildMember) => {
    const user_local = message.mentions.users.first();
    if(user_local)console.log('user banat: %s - %s',user_local.username,user_local.id);
    else return message.channel.send('Error finding user');

    for(const entry of this.BanList){
      
      if(entry.id_banned_user === user_local.id){
        if(entry.id_banned_by === message.author.id){
          console.log('user unbanned %s',entry);
          const idx = this.BanList.indexOf(entry);
          delete this.dbBan[entry.id_banned_user];
          this.BanList.splice(idx,1);
          
          //todo:remove role

          const guild = this.client.guilds.cache.get(entry.guild_id);   // copy the id of the server your bot is in and paste it in place of guild-ID.
          const role = guild.roles.cache.get(LFGSettings.BANNED_ROLE);  // here we are getting the role object using the id of that role.
          const member =  await guild.members.fetch(entry.id_banned_user); // here we are getting the member object using the id of that member. This is the member we will add the role to.
          member.roles.remove(role);   // here we just added the role to the member we got.
        }else{
          return message.channel.send(`Nu esti autorul BAN-ului, autorul este:  \`${ entry.banned_by}\`, contacteaza autorul pt unban`);
        }
      }else{
        console.log('user still banned %s',entry);
      }

    }
    this.save_bans();
  }

  BAN_user = async(text: string, message: Message, member: GuildMember) => {
    if (!canBan(member)) {
      return this.sendNoPermsBAN(message);
    }

    const user_local = message.mentions.users.first();
    if(user_local)console.log('user banat: %s - %s',user_local.username,user_local.id);
    else return message.channel.send('Error finding user');

    let time: Date | null = null;
    while (!time) {
      const resp = message;
      const content = resp.content.toString().toLowerCase().trim();
      if (dataFormatRegex.test(content)) {
        const [
          _,
          D,
          M,
          h = moment().tz('EET').format('HH'),
          m = moment().tz('EET').format('mm'),
        ] = dataFormatRegex.exec(content);
        time = moment(`${h}:${m} ${D}/${M}`, 'HH:mm DD/MM EET').tz('EET', true).toDate();
        if (time && !isDateValid(time)) {
          return message.channel.send('Data nu este corecta');
        }
        if (time && time.getTime() < Date.now() - 60 * 1000) {
          return message.channel.send('Data este in trecut.');
        }
      }else{
        return message.channel.send('Data nu este corecta');
        break;
      }
    }

    //console.log('time/date', 'settled', time);
    
    
    //console.log('user banat de: %s',message.author.username,message.author.id);
    
    var new_ban: BanData;
    new_ban = {guild_id: message.guild.id,id_banned_by:message.author.id,id_banned_user: user_local.id,dueDate:time,banned_by:message.author.username,banned_user:user_local.username};
    var gasit = false;
    var idx_ = 0;
    console.log('ban data %s',new_ban.dueDate);
    for(const entry of this.BanList){
      if(entry.id_banned_user == new_ban.id_banned_user){
        if(entry.dueDate < new_ban.dueDate){
          this.BanList[idx_].dueDate = new_ban.dueDate;
          //console.log(`adaugat timp user \`${new_ban.banned_user}\` by \`${new_ban.banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth()+1}\r\n`);
          this.scheduledJobs.push(new ScheduleTask(time, this.notify));
          var str_ban: jsonBanData = {guild_id: message.guild.id,id_banned_by:message.author.id,id_banned_user: user_local.id,dueDate:time.toDateString(),banned_by:message.author.username,banned_user:user_local.username};
          this.dbBan[user_local.id] = str_ban;
          this.save_bans();
          return message.channel.send(`Adaugat timp user \`${this.BanList[idx_].banned_user}\` by \`${this.BanList[idx_].banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth()+1}\r\n`)
        }else{
          return message.channel.send(`User deja banat \`${ this.BanList[idx_].banned_user}\` by \`${ this.BanList[idx_].banned_by}\` -> ${ this.BanList[idx_].dueDate.getDate()} \/ ${ this.BanList[idx_].dueDate.getMonth()+1}\r\n`)
        }
        gasit = true;
      }
      idx_++;
    }   

    if(!gasit){
      this.BanList.push(new_ban); 
      this.scheduledJobs.push(new ScheduleTask(time, this.notify))
      const guild = this.client.guilds.cache.get(message.guild.id);   // copy the id of the server your bot is in and paste it in place of guild-ID.
      const role = guild.roles.cache.get(LFGSettings.BANNED_ROLE);  // here we are getting the role object using the id of that role.
      const member =  await guild.members.fetch(user_local.id); // here we are getting the member object using the id of that member. This is the member we will add the role to.
      member.roles.add(role);   // here we just added the role to the member we got.
      var str_ban: jsonBanData = {guild_id: message.guild.id,id_banned_by:message.author.id,id_banned_user: user_local.id,dueDate:time.toDateString(),banned_by:message.author.username,banned_user:user_local.username};
      this.dbBan[user_local.id] = str_ban;
      //console.log('writing data: %s',this.dbBan);
      this.save_bans();
      return message.channel.send(`Banned user \`${new_ban.banned_user}\` by \`${new_ban.banned_by}\` -> ${new_ban.dueDate.getDate()} \/ ${new_ban.dueDate.getMonth()+1}\r\n`);
    }
    return message.channel.send('Error banning user!');
    
  }

  listBAN = (text: string, message: Message, member: GuildMember) => {
    if (!canBan(member)) {
      return this.sendNoPermsBAN(message);
    }
    var idx = 0;
    var out_str: string = '';
    var local_str: string = '';
    for(const entry of this.BanList){
      //console.log('banned user %s by %s -> %s\r\n',entry.banned_user,entry.banned_by,entry.dueDate);
      local_str = `Banned user \`${entry.banned_user}\` by \`${entry.banned_by}\` -> ${entry.dueDate.getDate()} \/ ${entry.dueDate.getMonth()+1}\r\n`
      //console.log(local_str);
      out_str = out_str + local_str;
      idx++;
    }
    console.log(out_str.length);
    if(out_str.length > 0){
      return message.channel.send(out_str);
    }else{
      return message.channel.send('No banned user in this server!');
    }
  }
  setCommand = (text: string, message: Message, member: GuildMember, type: 'edit' | 'create') => {

    if (!canEditCommands(member)) {
      return this.sendNoPerms(message);
    }
    let [commandName, commandText] = splitOnFirst(text, "|").map(x => x?.trim());
    if (
      !commandName?.trim() ||
      !commandText?.trim() ||
      !/^(?:\?|\!)?[a-z0-9\-._#$%^&*]*$/ig.test(commandName?.trim())
    ) {
      return message.channel.send(`Sintaxa corecta este \`${withPrefix(type === 'create' ? CREATE_COMMAND : EDIT_COMMAND)} nume-comanda | text comanda\``)
    }

    commandName = commandName.toLowerCase();
    if (commandName[0] === settings.prefix) {
      commandName = commandName.substr(1);
    }

    if (
      type === "create" &&
      (
        this.db[commandName] ||
        [CREATE_COMMAND, EDIT_COMMAND, DEL_COMMAND, COMMANDS_COMMAND, HELP_COMMAND].indexOf(commandName) !== -1
      )
    ) {
      return message.channel.send(`Comanda \`${withPrefix(commandName)}\` exista deja`);
    }

    this.db[commandName] = commandText;
    this.save();
    console.log(`${type.toUpperCase()}: ${message.author.username} | ${commandName} -> ${commandText}`);
    return message.channel.send(`Comanda \`${withPrefix(commandName)}\` a fost ${type === 'create' ? 'creata' : 'modificata'}!`);
  }

  delCommand = (text: string, message: Message, member: GuildMember) => {
    if (!canEditCommands(member)) {
      return this.sendNoPerms(message);
    }

    let commandName = text?.trim()?.toLowerCase() ?? '';
    if (
      !commandName
    ) {
      return message.channel.send(`Sintaxa corecta este \`${withPrefix(DEL_COMMAND)} nume-comanda\``)
    }

    if (!this.db[commandName]) {
      return message.channel.send(`Comanda \`${withPrefix(commandName)}\` nu exista`);
    }

    delete this.db[commandName];
    this.save();
    console.log(`DEL: ${message.author.username} | ${commandName}`);
    return message.channel.send(`Comanda \`${withPrefix(commandName)}\` a fost stearsa!`);
  }

  listCommands = async (message: Message, member: GuildMember) => {
    const adminCommands = canEditCommands(member) ? [
      '--------- Administrare ---------',
      `\`${withPrefix(CREATE_COMMAND)} nume-comanda | text comanda\` - creaza o comanda`,
      `\`${withPrefix(EDIT_COMMAND)} nume-comanda | text comanda\` - modifica o comanda`,
      `\`${withPrefix(DEL_COMMAND)} nume-comanda\` - sterge o comanda`,
    ] : [];

    const commands = [
      ...adminCommands,
      `\`${withPrefix(HELP_COMMAND)}\` / \`${withPrefix(COMMANDS_COMMAND)}\` - vezi comenzi disponibile`,
      '---------- Comenzi existente -----------',
      ...Object.keys(this.db).map(x => `\`${pad(withPrefix(x), 20, ' ')}\` -> ${text2codeBlock(this.db[x])}`)
    ];

    await sendMessage(commands, message.channel);
  }

  sendMessageIfCommand = (message: Message) => {
    const text = message.content.toLowerCase().trim();

    Object.keys(this.db).forEach(key => {
      if (withPrefix(key) === text) {
        console.log(text, 'matched command', key);
        return message.channel.send({
          content: this.db[key],
          split: {
            char: '\n',
            maxLength: 1950
          }
        });
      }
    });
  }
}
