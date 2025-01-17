let queue = [];
let processingAction = null;

class StorageAction {
  constructor() {
    this.result = null;
    this.callback = new Promise();
  }
  async execute() {
    this.result = await this.process();
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
}

const getProcessingAction = () => {
  return processingAction;
}

const getQueueLength = () => {
  return queue.length;
}

const processNext = async () => {
  if (processingAction !== null) return;

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
