let queue = [];
let processingAction = null;

class StorageAction {
  constructor() {
    this.result = null;
  }
  addAndWait(insertFirst = false) {
    this.promise = new Promise((resolve, reject) => {
      console.debug(`promise set for action (${this.getType()})`);
      this.resolve = resolve;
      this.reject = reject;
    });

    if (insertFirst) insertToQueue(this);
    else addToQueue(this);

    return this.promise;
  }
  async execute() {
    try {
      this.result = await this.process();
      console.debug(`Steamworks extras: Action executed: `, this);
      if (this.resolve !== undefined) this.resolve(this.result);
    }
    catch (e) {
      if (this.reject !== undefined) this.reject(e);
    }
  }
  async process() { }
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

const processNext = async () => {
  console.debug(`Steamworks extras: Attempting to process next action in queue (${queue.length} left)`);

  if (processingAction !== null && processingAction !== undefined) {
    console.debug(`Steamworks extras: Already processing action (${processingAction.getType()}), waiting for it to finish.`);
    return;
  }

  processingAction = queue.shift();

  if (processingAction === undefined) return;

  console.debug(`Steamworks extras: Processing next action (${processingAction.getType()}) in queue:`, processingAction);

  try {
    await processingAction.execute();
    console.log(`Steamworks extras: Processed action (${processingAction.getType()}) in queue (${queue.length} left):`, processingAction);
  }
  catch (e) {
    console.error(`Steamworks extras: Error processing action (${processingAction.getType()}) in queue (${queue.length} left):`, processingAction, e);
  }

  processingAction = null;

  processNext();
}

const clearQueue = () => {
  queue = [];
}
