import 'source-map-support/register';

import * as Discord from 'discord.js'
import {Commands} from "./modules/commands";
import {LfgNotify} from "./modules/lfgNotify";

const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;

client.login(token).catch(console.error);

new Commands(client);
new LfgNotify(client);

client.on('ready', () => {
  console.log('Bot ready!');
});
