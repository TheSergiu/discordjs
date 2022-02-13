"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanUp = void 0;
const path = require("path");
const fs_1 = require("fs");
const scheduler_1 = require("./scheduler");
const client_1 = require("./client");
var CleanUp;
(function (CleanUp) {
    const file = path.join(process.cwd(), 'db', 'cleanup.json');
    const messages = [];
    function load() {
        if (fs_1.existsSync(file)) {
            const data = JSON.parse(fs_1.readFileSync(file).toString());
            data.messages.forEach(({ messageID, channelID, when }) => scheduleMessageDeletion(messageID, channelID, when));
        }
    }
    load();
    function save() {
        const data = {
            messages: messages.map(d => ({
                messageID: d.messageID,
                channelID: d.channelID,
                when: d.when
            }))
        };
        fs_1.writeFileSync(file, JSON.stringify(data, null, 2));
    }
    async function deleteMessage(messageID, channelID) {
        const channel = await client_1.client.channels.fetch(channelID);
        const message = await channel.messages.fetch(messageID);
        return message.delete();
    }
    function findMessageDeletionIndex(messageID, channelID) {
        return messages.findIndex(x => x.messageID === messageID && x.channelID === channelID);
    }
    function scheduleMessageDeletion(messageID, channelID, when) {
        if (findMessageDeletionIndex(messageID, channelID) !== -1) {
            console.warn(`Message ${messageID} from channel ${channelID} was already registered... unregistering before new entry`);
            cancelMessageDeletion(messageID, channelID);
        }
        console.log(`Cleanup: scheduled message ${messageID} from ${channelID} for deletion at ${new Date(when)} (${when}, or in ${(when - Date.now()) / 1000}s)`);
        messages.push({
            messageID,
            channelID,
            when,
            schedule: new scheduler_1.ScheduleTask(when, async () => {
                try {
                    await deleteMessage(messageID, channelID);
                }
                catch (e) {
                    console.error(`Failed to delete message ${messageID} from ${channelID} because`, e);
                }
                finally {
                    cancelMessageDeletion(messageID, channelID);
                    save();
                }
            })
        });
        save();
    }
    CleanUp.scheduleMessageDeletion = scheduleMessageDeletion;
    function cancelMessageDeletion(messageID, channelID) {
        const index = findMessageDeletionIndex(messageID, channelID);
        if (index === -1)
            return;
        const [entry] = messages.splice(index, 1);
        if (!entry.schedule.fired) {
            console.log(`Cleanup: cancelled message ${messageID} from ${channelID} for deletion`);
            entry.schedule.cancel();
        }
        save();
    }
    CleanUp.cancelMessageDeletion = cancelMessageDeletion;
})(CleanUp = exports.CleanUp || (exports.CleanUp = {}));
//# sourceMappingURL=cleanup.js.map