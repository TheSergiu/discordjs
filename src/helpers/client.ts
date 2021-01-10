import * as Discord from 'discord.js'

const localClient = new Discord.Client({
  partials: ['USER','GUILD_MEMBER']
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN not set in env vars");
}

export const loginPromise = localClient.login(token);

export const getClient = () => loginPromise.then(() => localClient);