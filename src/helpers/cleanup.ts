import * as path from 'path';
import {existsSync, readFileSync, writeFileSync} from "fs";
import {Snowflake, TextChannel} from "discord.js";
import {ScheduleTask} from "./scheduler";
import {client} from "./client";

type JSONDataType = {
  messages: {
    messageID: Snowflake,
    channelID: Snowflake,
    when: number
  }[]
}

export namespace CleanUp {
  const file = path.join(process.cwd(), 'db', 'cleanup.json');

  const messages: (JSONDataType['messages'][number] & { schedule: ScheduleTask })[] = [];

  function load() {
    if (existsSync(file)) {
      const data: JSONDataType = JSON.parse(readFileSync(file).toString());
      data.messages.forEach(({messageID, channelID, when}) =>
        scheduleMessageDeletion(messageID, channelID, when)
      );
    }
  }

  load();

  function save() {
    const data: JSONDataType = {

      messages: messages.map(d => ({
        messageID: d.messageID,
        channelID: d.channelID,
        when: d.when
      }))

    }
    writeFileSync(file, JSON.stringify(data, null, 2));
  }

  async function deleteMessage(messageID: Snowflake, channelID: Snowflake) {
    const channel = await client.channels.fetch(channelID) as TextChannel;

    const message = await channel.messages.fetch(messageID);

    return message.delete();
  }

  function findMessageDeletionIndex(messageID: Snowflake, channelID: Snowflake) {
    return messages.findIndex(x => x.messageID === messageID && x.channelID === channelID);
  }

  export function scheduleMessageDeletion(messageID: Snowflake, channelID: Snowflake, when: number) {
    if (findMessageDeletionIndex(messageID, channelID) !== -1) {
      console.warn(`Message ${messageID} from channel ${channelID} was already registered... unregistering before new entry`);
      cancelMessageDeletion(messageID, channelID);
    }

    console.log(`Cleanup: scheduled message ${messageID} from ${channelID} for deletion at ${new Date(when)} (${when}, or in ${(when - Date.now()) / 1000}s)`);
    messages.push({
      messageID,
      channelID,
      when,
      schedule: new ScheduleTask(when, async () => {
        try {
          await deleteMessage(messageID, channelID)
        } catch (e) {
          console.error(`Failed to delete message ${messageID} from ${channelID} because`, e);
        } finally {
          cancelMessageDeletion(messageID, channelID);
          save();
        }
      })
    });
    save();
  }

  export function cancelMessageDeletion(messageID: Snowflake, channelID: Snowflake) {
    const index = findMessageDeletionIndex(messageID, channelID);
    if (index === -1) return;

    const [entry] = messages.splice(index, 1);
    if (!entry.schedule.fired) {
      console.log(`Cleanup: cancelled message ${messageID} from ${channelID} for deletion`);
      entry.schedule.cancel();
    }
    save();
  }
}