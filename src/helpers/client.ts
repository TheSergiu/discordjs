import * as Discord from 'discord.js'

const localClient = new Discord.Client({
  partials: ['USER', 'GUILD_MEMBER']
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN not set in env vars");
}

export const client = localClient;

let didLogin = false;
export const loginClient = () => {
  if (didLogin) return;

  didLogin = true;
  return localClient.login(token);
}