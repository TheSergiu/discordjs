import {GuildMember} from "discord.js";
import {readFileSync} from "fs";
import * as path from 'path';

type Settings = {
  prefix: string,
  command_editors: string[],
  Banning_roles: string[]
}

export const settings: Readonly<Settings> = JSON.parse(readFileSync(path.join(__dirname, '..', 'settings.json')).toString());

export const withPrefix = (s: string) => `${settings.prefix}${s}`;

const rolesThatCanEdit = new Set<string>(settings.command_editors.map(x => x.toLowerCase()));
const rolesThatCanBAN = new Set<string>(settings.Banning_roles.map(x => x.toLowerCase()));
export const canEditCommands = (member: GuildMember) => {
  return member.roles.cache.some(role => rolesThatCanEdit.has(role.name.toLowerCase()));
}

export const canBan = (member: GuildMember) => {
  return member.roles.cache.some(role => rolesThatCanBAN.has(role.name.toLowerCase()));

}


export type BanData = {
  guild_id: string,
  id_banned_by: string,
  id_banned_user: string,
  dueDate: Date,
  banned_by: string,
  banned_user: string,
}

export type jsonBanData = {
  guild_id: string,
  id_banned_by: string,
  id_banned_user: string,
  dueDate: string,
  banned_by: string,
  banned_user: string,
}
