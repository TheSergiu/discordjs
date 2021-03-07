import Timeout = NodeJS.Timeout;

const allTasks: Set<ScheduleTask> = new Set;

export class ScheduleTask<T extends Function = Function> {
  private interval: Timeout;
  readonly when: number;
  private readonly fn: T;
  private _fired = false;

  constructor(when: Date | number, fn: T) {
    this.interval = setInterval(this.check, 1000);
    this.when = when instanceof Date ? when.getTime() : when;
    this.fn = fn;
    allTasks.add(this);
  }

  check = () => {
    if (this.when < Date.now() && this.interval) {
      this.fn();
      this._fired = true;
      this.cancel();
    }
  }

  cancel = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      allTasks.delete(this);
    }
  }

  get fired() {
    return this._fired;
  }
}