import {Channel, Message, User} from "discord.js";
import {PromiseTimeoutError} from "./index";

export class UserResponseManager {
  private readonly channel: Channel
  private readonly user: User

  constructor(channel: Channel, user: User) {
    this.user = user;
    this.channel = channel;
  }

  async waitResponse(timeoutMS?: number) {
    return await new Promise<Message>((res, rej) => {

      let dispatched = false;

      const dispatch = (msg: Message) => {
        if (msg.member.user.id !== this.user.id) return;
        if (msg.channel.id !== this.channel.id) return;

        dispatched = true;
        return res(msg);
      }

      this.channel.client.on('message', dispatch);

      if (timeoutMS) {
        setTimeout(() => {
          if (!dispatched) {
            this.channel.client.removeListener('message', dispatch);
            return rej(new PromiseTimeoutError());
          }
        }, timeoutMS);
      }
    });
  }

  async waitResponseAndDeleteMessage(timeoutMS?: number) {
    const message = await this.waitResponse(timeoutMS);
    await message.delete();
    return message;
  }


}