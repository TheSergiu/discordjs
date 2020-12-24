import {Channel, Message, User} from "discord.js";

export class UserResponseManager {
  private readonly channel: Channel
  private readonly user: User

  constructor(channel: Channel, user: User) {
    this.user = user;
    this.channel = channel;
  }

  async waitResponse() {
    return await new Promise<Message>(res => {

      this.channel.client.on('message', msg => {

        if (msg.member.user.id !== this.user.id) return;
        if (msg.channel.id !== this.channel.id) return;

        return res(msg);
      });
    });
  }

  async waitResponseAndDeleteMessage() {
    const message = await this.waitResponse();
    await message.delete();
    return message;
  }


}