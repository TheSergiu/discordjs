import {EventEmitter} from "events";
import {client} from "./client";
import {MessageEmbed, Snowflake} from "discord.js";

export enum CommandType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
}

export type CommandCreateType = {
  type: CommandType
  name: string,
  description: string,
  options?: {
    name: string,
    description: string,
    type: CommandType
    required?: boolean
    choices?: {
      name: string
      value: string
    }[]
    options?: CommandCreateType['options']
  }[]
}

export type DiscordInteraction = {
  version: number
  type: number
  token: string
  member: {
    "user": {
      "username": string,
      "public_flags": number,
      "id": Snowflake,
      "discriminator": string,
      "avatar": string
    },
    "roles": Snowflake[],
    "permissions": Snowflake,
    "pending": boolean,
    "nick": string | null,
    "mute": boolean,
    "joined_at": string,
    "is_pending": boolean,
    "deaf": boolean
  }
  "id": Snowflake,
  "guild_id": Snowflake,
  "data": {
    "name": string,
    options: {
      type: CommandType,
      name: string
      value?: string
      options?: DiscordInteraction['data']['options']
    }[]
    "id": Snowflake
  },
  "channel_id": Snowflake
  "application_id": Snowflake
}

type CommandCreateResponse = {
  id: Snowflake,
  application_id: Snowflake,
  name: string,
  description: string,
  version: Snowflake,
  default_permission: boolean
}

export interface CmdHelper extends EventEmitter {
  on(event: 'command', listener: (i: DiscordInteraction) => void): this
}

export class CmdHelper extends EventEmitter {

  readonly command: CommandCreateType;

  readonly replayFn: (i: DiscordInteraction) => { content?: string, embeds?: MessageEmbed[] }

  private commandID: Snowflake | null = null;

  constructor(command: CommandCreateType, replyFn: CmdHelper['replayFn']) {
    super();

    this.command = command;
    this.replayFn = replyFn;
  }

  ensure = async () => {

    for (const guild of client.guilds.cache.values()) {
      console.log(`Creating command "${this.command.name}" for guild "${guild.name}"`);

      const resp: CommandCreateResponse = await (client as any)
        .api
        .applications(client.user.id)
        .guilds(guild.id)
        .commands
        .post({
          data: this.command
        });

      this.commandID = resp.id;

    }
  }

  start = () => {
    if (!this.commandID) {
      throw new Error('Cannot start listen without ensuring command.')
    }

    client.ws.on('INTERACTION_CREATE' as any, async (interaction: DiscordInteraction) => {

      const r = await (client as any).api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: this.replayFn(interaction)
        }
      });

      this.emit('command', interaction);
    });
  }

}