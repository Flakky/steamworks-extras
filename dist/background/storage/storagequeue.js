let queue = [];
let processingAction = null;
let failedActions = [];

class StorageActionSettings {
  constructor({
    executeTimeout = 20, // In seconds
    minimalExecutionTime = 0 // In milliseconds
  } = {}) {
    this.executeTimeout = executeTimeout;
    this.minimalExecutionTime = minimalExecutionTime;
  }
}

class StorageAction {
  constructor(settings = new StorageActionSettings()) {
    this.result = null;
    this.executeTimeout = settings.executeTimeout;
    this.minimalExecutionTime = settings.minimalExecutionTime;
    this.timedout = false;
    this.completed = false;
    this.error = null;
  }

  addAndWait(insertFirst = false) {
    const promise = this.getPromise();
    if (insertFirst) insertToQueue(this);
    else addToQueue(this);

    return promise;
  }

  execute() {
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
      this.error = e;
      if (this.reject !== undefined) {
        if (this.minimalTimerComplete) {
          this.reject(e);
        }
        // else: wait for minimalTimerHandle to fire and reject there
      }
    }

    return promise;
  }

  getPromise() {
    if (this.promise === undefined) {
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
    this.reject(new Error(`Storage action timed out: `, this));
  }

  async process() { /* Should be overridden by child classes */ }

  async getResult() {
    return this.result;
  }

  getType() { return 'StorageAction'; }
}

const addToQueue = (action) => {
  queue.push(action);

  processNext();
}

const insertToQueue = (action) => {
  queue.unshift(action);

  processNext();
}

const getProcessingAction = () => {
  return processingAction;
}

const getQueueLength = () => {
  return queue.length;
}

const getActionsOfType = (type) => {
  return queue.filter(action => action.getType() === type);
}

const getActionsByAppID = (appID) => {
  return queue.filter(action => action.appID === appID);
}

const getActionsByAppIDAndType = (appID, type) => {
  return queue.filter(action => action.appID === appID && action.getType() === type);
}

const getFailedActions = () => {
  return failedActions;
}

const removeActionsByTag = (tag) => {
  queue = queue.filter(action => !action.getType().includes(tag));
}

const processNext = () => {
  if (processingAction !== null && processingAction !== undefined) return;

  processingAction = queue.shift();

  if (processingAction === undefined) return;

  console.debug(`Processing next action (${processingAction.getType()}) in queue:`, processingAction);

  processingAction.execute()
    .then(() => {
      console.log(`Action executed (${getQueueLength()} left) `, processingAction);
    })
    .catch((e) => {
      failedActions.push(processingAction);
      console.warn(`Action failed to execute (${getQueueLength()} left) `, processingAction, e);
    })
    .finally(() => {
      processingAction = null;
      processNext();
    });
}

const clearQueue = () => {
  queue = [];
}
