import { StorageAction } from './storageaction';

export class StorageActionsQueue {
  private queue: StorageAction[] = [];
  private processingAction: StorageAction | null = null;
  private failedActions: StorageAction[] = [];
  
  constructor() {
    this.queue = [];
    this.processingAction = null;
    this.failedActions = [];
  }

  addToQueue = (action: StorageAction): Promise<any> => {
    this.queue.push(action);
  
    this.processNext();

    return action.getPromise();
  }
  
  insertToQueue = (action: StorageAction): Promise<any> => {
    this.queue.unshift(action);
  
    this.processNext();

    return action.getPromise();
  }

  getQueue = (): StorageAction[] => {
    return this.queue;
  }

  getProcessingAction = (): StorageAction | null => {
    return this.processingAction;
  }
  
  getQueueLength = (): number => {
    return this.queue.length;
  }
  
  getActionsOfType = (type: string): StorageAction[] => {
    return this.queue.filter(action => action.getType() === type);
  }
  
  getActionsByAppID = (appID: string): StorageAction[] => {
    return this.queue.filter(action => action.getAppID() === appID);
  }
  
  getActionsByAppIDAndType = (appID: string, type: string): StorageAction[] => {
    return this.queue.filter(action => action.getAppID() === appID && action.getType() === type);
  }
  
  getFailedActions = (): StorageAction[] => {
    return this.failedActions;
  }
  
  removeActionsByTag = (tag: string): void => {
    this.queue = this.queue.filter(action => !action.getType().includes(tag));
  }
  
  processNext = (): void => {
    if (this.processingAction !== null && this.processingAction !== undefined) return;
  
    this.processingAction = this.queue.shift() as StorageAction;
  
    if (this.processingAction === undefined || this.processingAction === null) return;
 
    const currentAction = this.processingAction!;
  
    console.debug(`Processing next action (${currentAction.getType()}) in queue:`, currentAction);
  
    currentAction.execute()
    .then(() => {
      console.log(`Action executed (${this.getQueueLength()} left) `, currentAction);
    })
    .catch((e) => {
      this.failedActions.push(currentAction);
      console.warn(`Action failed to execute (${this.getQueueLength()} left) `, currentAction, e);
    })
    .finally(() => {
      this.processingAction = null;
      this.processNext();
    });
  }
  
  clearQueue = (): void => {
    this.queue = [];
  }
}

