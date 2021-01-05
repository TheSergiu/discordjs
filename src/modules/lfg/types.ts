import {Snowflake} from "discord.js";


export enum LFGActivity {
  'dsc' = "Deep Stone Crypt",
  'garden' = 'Garden of Salvation',
  'lw' = 'Last Wish'
}

export type LFGManagerData = {
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
