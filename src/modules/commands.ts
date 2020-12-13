import * as path from 'path';
import {readFileSync, writeFileSync} from "fs";
import {Client, GuildMember, Message} from "discord.js";
import {canEditCommands, settings, withPrefix} from "../settings";
import {maxCharPerMessage, sendMessage, splitOnFirst, text2codeBlock} from "../helpers";
import * as pad from 'pad';

const CREATE_COMMAND = 'create';
const EDIT_COMMAND = 'edit';
const DEL_COMMAND = 'del';
const COMMANDS_COMMAND = 'commands';
const HELP_COMMAND = 'help';

const commandsDbPath = path.join(process.cwd(), 'db', 'commands.json');

export class Commands {
  db: ({ [s: string]: string }) = {};
  client: Client

  constructor(client: Client) {
    this.load();
    this.client = client;
    this.client.on('message', this.dispatch);
    client.user?.setActivity(withPrefix(HELP_COMMAND), {type: "PLAYING"}).catch(console.error);
  }

  save = () => {
    writeFileSync(commandsDbPath, JSON.stringify(this.db, null, 2));
  }
  load = () => {
    this.db = JSON.parse(readFileSync(commandsDbPath).toString());
  }

  sendNoPerms = (message: Message) => {
    return message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
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

    return this.sendMessageIfCommand(message);
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
