"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleTask = void 0;
const allTasks = new Set;
class ScheduleTask {
    constructor(when, fn) {
        this._fired = false;
        this.check = () => {
            if (this.when < Date.now() && this.interval) {
                this.fn();
                this._fired = true;
                this.cancel();
            }
        };
        this.cancel = () => {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
                allTasks.delete(this);
            }
        };
        this.interval = setInterval(this.check, 1000);
        this.when = when instanceof Date ? when.getTime() : when;
        this.fn = fn;
        allTasks.add(this);
    }
    get fired() {
        return this._fired;
    }
}
exports.ScheduleTask = ScheduleTask;
//# sourceMappingURL=scheduler.js.map