"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResponseManager = void 0;
const index_1 = require("./index");
class UserResponseManager {
    constructor(channel, user) {
        this.user = user;
        this.channel = channel;
    }
    async waitResponse(timeoutMS) {
        return await new Promise((res, rej) => {
            let dispatched = false;
            const dispatch = (msg) => {
                var _a, _b;
                if (((_b = (_a = msg.member) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) !== this.user.id)
                    return;
                if (msg.channel.id !== this.channel.id)
                    return;
                dispatched = true;
                return res(msg);
            };
            this.channel.client.on('message', dispatch);
            if (timeoutMS) {
                setTimeout(() => {
                    if (!dispatched) {
                        this.channel.client.removeListener('message', dispatch);
                        return rej(new index_1.PromiseTimeoutError());
                    }
                }, timeoutMS);
            }
        });
    }
    async waitResponseAndDeleteMessage(timeoutMS) {
        const message = await this.waitResponse(timeoutMS);
        await message.delete();
        return message;
    }
}
exports.UserResponseManager = UserResponseManager;
//# sourceMappingURL=UserResponseManager.js.map