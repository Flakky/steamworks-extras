export class StorageActionSettings {
    executeTimeout: number;
    minimalExecutionTime: number;
  
    constructor({
      executeTimeout = 20, // In seconds
      minimalExecutionTime = 0 // In milliseconds
    } = {}) {
      this.executeTimeout = executeTimeout;
      this.minimalExecutionTime = minimalExecutionTime;
    }
  }
  
export class StorageAction {
    private appID: string;
    private result: any = null;
    private executeTimeout: number;
    private minimalExecutionTime: number;
    private timedout: boolean = false;
    private completed: boolean = false;
    private error: Error | null = null;
    private timeoutHandle: number = 0;
    private minimalTimerHandle: number = 0;
    private minimalTimerComplete: boolean = false;
    private promise: Promise<any> | null = null;
    private resolve: (value: any) => void = () => {};
    private reject: (reason?: any) => void = () => {};
  
    constructor(appID: string, settings = new StorageActionSettings()) {
      this.appID = appID;
      this.result = null;
      this.executeTimeout = settings.executeTimeout;
      this.minimalExecutionTime = settings.minimalExecutionTime;
      this.timedout = false;
      this.completed = false;
      this.error = null;
    }
  
    execute(): Promise<any> {
      const promise = this.getPromise();
  
      this.timeoutHandle = setTimeout(() => { this.timeout() }, this.executeTimeout * 1000);
  
      // Minimal execution timer
      if (this.minimalExecutionTime > 0) {
        this.minimalTimerComplete = false;
        this.minimalTimerHandle = setTimeout(() => {
          this.minimalTimerComplete = true;
          if (this.completed && !this.timedout) {
            if (this.error !== null) {
              this.reject(this.error);
            } else {
              this.resolve(this.result);
            }
          }
        }, this.minimalExecutionTime);
      } else {
        this.minimalTimerComplete = true;
      }
  
      // Action execution
      try {
        this.process()
          .then(r => {
            this.result = r;
            this.completed = true;
  
            if (!this.timedout) {
              if (this.minimalTimerComplete) {
                this.resolve(r);
              }
              // else: wait for minimalTimerHandle to fire and resolve there
            }
          })
          .catch(e => {
            this.completed = true;
            this.error = e;
            if (!this.timedout) {
              if (this.minimalTimerComplete) {
                this.reject(e);
              }
              // else: wait for minimalTimerHandle to fire and reject there
            }
          })
          .finally(() => {
            clearTimeout(this.timeoutHandle);
          });
      }
      catch (e) {
        this.completed = true;
        this.error = e as Error;
        if (this.reject !== undefined) {
          if (this.minimalTimerComplete) {
            this.reject(e);
          }
          // else: wait for minimalTimerHandle to fire and reject there
        }
      }
  
      return promise;
    }

    getPromise(): Promise<any> {
      if (this.promise === undefined || this.promise === null) {
        this.promise = new Promise((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        });
      }
      return this.promise;
    }
  
    timeout() {
      this.timedout = true;
      clearTimeout(this.minimalTimerHandle);
      this.reject(new Error(`Storage action timed out: ${this}`));
    }
  
    async process() { /* Should be overridden by child classes */ }
  
    async getResult() {
      return this.result;
    }
  
    getAppID() { return this.appID; }
  
    getType() { return 'StorageAction'; }
  
    toString() {
      return `StorageAction: ${this.getType()}`;
    }
}

export interface DateAction {
    date: Date;
}

export interface DateRangeAction {
    dateStart: Date;
    dateEnd: Date;
}
