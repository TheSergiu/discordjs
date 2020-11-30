import {GuildMember} from "discord.js";
import {readFileSync} from "fs";
import * as path from 'path';

type Settings = {
  prefix: string,
  command_editors: string[]
}

export const settings: Readonly<Settings> = JSON.parse(readFileSync(path.join(__dirname, '..', 'settings.json')).toString());

export const withPrefix = (s: string) => `${settings.prefix}${s}`;

const rolesThatCanEdit = new Set<string>(settings.command_editors.map(x => x.toLowerCase()));
export const canEditCommands = (member: GuildMember) => {
  return member.roles.cache.some(role => rolesThatCanEdit.has(role.name.toLowerCase()));
}
