import {Snowflake} from "discord.js";


export enum LFGActivity {
  'dsc' = "Deep Stone Crypt",
  'garden' = 'Garden of Salvation',
  'lw' = 'Last Wish',
  'vog' = 'Vault Of Glass',
  'votd' = 'Vow of the Disciple',
  'all' = 'Sesiune Raiduri'
}

export type LFGManagerData = {
  id: string,
  messageID?: Snowflake
  creator: { username: string, id: Snowflake, nick: string}
  participants: { username: string, id: Snowflake , nick: string}[]
  alternatives: { username: string, id: Snowflake, nick: string}[]
  inexperienced: { username: string, id: Snowflake, nick: string}[]

  dueDate: number,
  activity: LFGActivity,
  desc?: string
}
