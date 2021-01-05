import {DMChannel, EmojiResolvable, Message, NewsChannel, Snowflake, TextChannel, User} from "discord.js";
import {EMOJIS} from "./constants";
import {strict, throws} from "assert";

export function splitOnFirst(s: string, delimiter: string): [string, string | undefined] {
  const [a, ...b] = s.split(delimiter);

  return [a, b ? b.join(delimiter) : undefined];
}

export function text2codeBlock(s: string): string {
  if (s.indexOf('`') === -1) {
    if (s.indexOf('\n') !== -1) {
      return `\`\`\`${s}\`\`\``;
    } else {
      return `\`${s}\``;
    }
  }

  if (/```([^`]*)?```/gi.test(s)) {
    if (/^```/.test(s) && /```$/.test(s)) {
      return s;
    }
    s = s.replace(/`/g, '\'');
    return `\`\`\`${s}\`\`\``;
  }


  return `\`\`\`${s.replace(/`/g, '')}\`\`\``
}

export function maxCharPerMessage(s: string | string[]) {
  if (typeof s === "string") {
    s = s.split('\n');
  }

  const messages: string[][] = [[]];

  const MAX = 1950;
  let lastEntryLen = 0;

  while (s.length) {
    const line = s.splice(0, 1)[0];

    if (lastEntryLen + line.length > MAX) {
      messages.push([]);
      lastEntryLen = 0;
    }

    lastEntryLen += line.length;
    messages[messages.length - 1].push(line);
  }

  return messages;
}

export async function sendMessage(s: string | string[], channel: TextChannel | DMChannel | NewsChannel) {
  const messages = maxCharPerMessage(s);

  for (let i = 0; i < messages.length; i++) {
    await channel.send({
      content: messages[i].join('\n'),
      split: {
        char: '\n',
        maxLength: 1950
      }
    });
  }
}

export async function removeReactionFromMessageByUser(message: Message, userOrID: User | Snowflake, emojiFilter?: { name?: string, id?: Snowflake }) {
  const userId = typeof userOrID === "string" ? userOrID : userOrID.id;

  const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(userId));

  await Promise.all([...userReactions.values()].map(async (reaction) => {
      if (emojiFilter) {
        if (emojiFilter.name && emojiFilter.name !== reaction.emoji.name) {
          return;
        }
        if (emojiFilter.id && emojiFilter.id !== reaction.emoji.id) {
          return;
        }
      }
      await reaction.users.remove(userId);
    })
  )
}


export async function userReacted(message: Message, userOrID: User | Snowflake, emojiFilter: { name?: string, id?: Snowflake }) {
  const userId = typeof userOrID === "string" ? userOrID : userOrID.id;

  const userReactions = message.reactions.cache.filter(reaction => (
    reaction.users.cache.has(userId) &&
    (
      reaction.emoji.name === emojiFilter.name ||
      reaction.emoji.id === emojiFilter.id
    )
  ));

  return userReactions.size > 0;
}

export async function ensureReaction(message: Message, user: User, react: EmojiResolvable) {
  if (await userReacted(message, user, {name: typeof react === "string" ? react : react.name})) {
    return;
  }
  await message.react(typeof react === "string" ? encodeURIComponent(react) : react);
}


export function emoji2react(emojiName: string): string {
  return encodeURIComponent(`:${emojiName}:`)
}

export const userID2Text = (userID: Snowflake): string => {
  return `<@${userID}>`;
}
export const channelID2Text= (channelID: Snowflake) : string => {
  return `<#${channelID}>`;
}

export function repeatArray<T>(arr: T[], times: number): T[] {
  let out = arr;
  for (let i = 1; i < times; i++) {
    out = out.concat(arr);
  }
  return out;
}

export function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export class PromiseTimeoutError extends Error {
  name: 'PromiseTimeoutError'
}

export function timeoutPromise<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    sleep(ms).then(() => {
      throw new PromiseTimeoutError();
    })
  ])
}

