import 'source-map-support/register';

import * as Discord from 'discord.js'
import {Message, MessageEmbed, TextChannel} from 'discord.js'
import {Commands} from "./modules/commands";
import {LfgNotify} from "./modules/lfgNotify";
import {SimpleReactionManager} from "./helpers/ReactionManager";
import {LFGModule} from "./modules/lfg";

const client = new Discord.Client({
  partials: ['USER', 'GUILD_MEMBER']
});
const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN not set in env vars");
}

console.log('Starting bot...')
;(async () => {

  client.on('ready', () => {
    console.log(
      `Bot has started, with 
  ${client.users.cache.size} users, in 
  ${client.channels.cache.size} channels of 
  ${client.guilds.cache.size} guilds.`
    );
  });

  try {

    console.log('Starting modules...');
    new Commands(client);
    new LfgNotify(client);
    new LFGModule(client);

    console.log('Logging in to discord...');
    await client.login(token);

    if (!client.readyAt) {
      console.log('Waiting on client to be ready...');
    }

  } catch (e) {
    console.error('Fatal!:', e);

    setTimeout(() => process.exit(1), 1000);
  }
})();

