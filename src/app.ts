import 'source-map-support/register';

import * as Discord from 'discord.js'
import {Commands} from "./modules/commands";
import {LfgNotify} from "./modules/lfgNotify";

const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN not set in env vars");
}

;(async () => {
  try {
    await client.login(token);

    new Commands(client);
    new LfgNotify(client);

    client.on('ready', () => {
      console.log('Bot ready!');
    });
  }catch (e){
    console.error('Fatal!:', e);

    setTimeout(() => process.exit(1), 1000);
  }
})();

