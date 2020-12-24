import {DMChannel, Message, NewsChannel, Snowflake, TextChannel, User} from "discord.js";

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

export function emoji2react (emojiName: string): string{
  return encodeURIComponent(`:${emojiName}:`)
}