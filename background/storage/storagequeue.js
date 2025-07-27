let queue = [];
let processingAction = null;
let failedActions = [];

class StorageAction {
  constructor() {
    this.result = null;
    this.executeTimeout = 20; // In seconds
    this.timedout = false;
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

    try {
      this.process()
        .then(r => {
          this.result = r;
          if (!this.timedout) this.resolve(r)
        })
        .catch(e => {
          if (!this.timedout) this.reject(e);
        })
        .finally(() => {
          clearTimeout(this.timeoutHandle);
        });
    }
    catch (e) {
      if (this.reject !== undefined) this.reject(e);
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
