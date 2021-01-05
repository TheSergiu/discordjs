import Timeout = NodeJS.Timeout;

const allTasks: Set<ScheduleTask> = new Set;

export class ScheduleTask<T extends Function = Function> {
  private interval: Timeout;
  private readonly when: number;
  private readonly fn: T;

  constructor(when: Date | number, fn: T) {
    this.interval = setInterval(this.check, 1000);
    this.when = when instanceof Date ? when.getTime() : when;
    this.fn = fn;
    allTasks.add(this);
  }

  check = () => {
    if (this.when < Date.now() && this.interval) {
      this.fn();
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

}