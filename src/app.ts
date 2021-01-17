import 'source-map-support/register';

import * as Discord from 'discord.js'
import {Commands} from "./modules/commands";
import {LfgNotify} from "./modules/lfgNotify";
import {LFGModule} from "./modules/lfg";
import {client, loginClient} from "./helpers/client";


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
    await loginClient();

    if (!client.readyAt) {
      console.log('Waiting on client to be ready...');
    }

    process.on('unhandledRejection', console.error);
    process.on('uncaughtException', console.error);

  } catch (e) {
    console.error('Fatal!:', e);

    setTimeout(() => process.exit(1), 1000);
  }
})();

