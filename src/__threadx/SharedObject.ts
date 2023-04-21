import type { BufferStruct, BufferStructConstructor } from './BufferStruct.js';
import { ThreadX } from './ThreadX.js';

type SOEventListener<This> = (target: This, data: any) => void;
export class SharedObject<
  WritableProps extends object = object,
  InstanceT extends BufferStruct & WritableProps = BufferStruct & WritableProps,
  T extends BufferStructConstructor<
    WritableProps,
    InstanceT
  > = BufferStructConstructor<WritableProps, InstanceT>,
> {
  private sharedObjectStruct: InstanceT | null;
  protected mutations: { [s in keyof WritableProps]?: true };
  private waitPromise: Promise<void> | null = null;
  private mutationsQueued = false;
  private dirtyProcessCount = 0;
  static staticConstructed = false;
  private _id: number;
  private _typeId: number;

  /**
   * Extract the buffer from a SharedObject
   *
   * @remarks
   * For internal use by ThreadX only
   *
   * @param sharedObject
   * @returns
   */
  static extractBuffer(
    sharedObject: SharedObject<any, BufferStruct>,
  ): SharedArrayBuffer {
    if (!sharedObject.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    return sharedObject.sharedObjectStruct.buffer;
  }

  constructor(
    sharedObjectStruct: InstanceT,
    protected curProps: WritableProps,
  ) {
    this.sharedObjectStruct = sharedObjectStruct;
    this._id = sharedObjectStruct.id;
    this._typeId = sharedObjectStruct.typeId;
    const constructor = this.constructor as typeof SharedObject;
    if (!constructor.staticConstructed) {
      constructor.staticConstructed = true;
      const prototype = Object.getPrototypeOf(this);
      Object.keys(curProps).forEach((key) => {
        Object.defineProperty(prototype, key, {
          get: function () {
            return this.curProps[key as keyof WritableProps];
          },
          set: function (value: any) {
            this.curProps[key as keyof WritableProps] = value;
            this.mutations[key as keyof WritableProps] = true;
            this.queueMutations();
          },
        });
      });
    }

    this.mutations = {};
  }

  get typeId(): number {
    return this._typeId;
  }

  get id(): number {
    return this._id;
  }

  /**
   * Assumes lock is acquired
   */
  processDirtyProperties(): void {
    if (!this.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    this.dirtyProcessCount++;
    const { sharedObjectStruct, mutations, curProps } = this;
    (sharedObjectStruct.constructor as T).propDefs.forEach((propDef, index) => {
      if (sharedObjectStruct.isDirty(index)) {
        const propName = propDef.name as keyof WritableProps;
        this.onPropertyChange(propName, sharedObjectStruct[propName]);
        delete mutations[propName];
        curProps[propName] = sharedObjectStruct[propName];
      }
    });
    sharedObjectStruct.resetDirty();
  }

  onPropertyChange(propName: keyof WritableProps, value: any): void {
    // console.log(`onPropertyChange: ${propName} = ${value} (${this.dirtyProcessCount}, ${ThreadX.threadName)`);
  }

  queueMutations(): void {
    if (this.mutationsQueued) {
      return;
    }
    this.mutationsQueued = true;
    queueMicrotask(() => {
      Promise.resolve()
        .then(async () => {
          this.mutationsQueued = false;
          if (!this.sharedObjectStruct) {
            throw new Error('SharedObject was destroyed');
          }
          await this.sharedObjectStruct.lockAsync(async () => {
            this._executeMutations();
          });
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  public flush(): void {
    if (!this.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    this.sharedObjectStruct.lock(() => {
      this._executeMutations();
    });
  }

  /**
   * Destroy the SharedObject on this thread only.
   *
   * @remarks
   * This stops any internal mutation processing, releases the reference
   * to the underlying BufferStruct/SharedArrayBuffer, and removes all
   * event listeners so that the SharedObject can be garbage collected.
   *
   * This does not destroy the SharedObject on other threads. To do that,
   * call `SharedObject.destroy()` on the other threads.
   */
  public destroy(): void {
    const struct = this.sharedObjectStruct;
    if (!struct) {
      return;
    }
    // Release the reference to the underlying BufferStruct/SharedArrayBuffer
    this.sharedObjectStruct = null;
    // Submit a notify in order to wake up self or other thread if waiting
    // on the struct. Need to do this otherwise memory leaks.
    struct.notify();
    // TODO: Issue a local-only destroy event?
    // Remove all event listeners
    this.eventListeners = {};
  }

  get isDestroyed(): boolean {
    return this.sharedObjectStruct === null;
  }

  protected _executeMutations(): void {
    if (!this.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    //console.log('start _queueMutations', this.sharedNode.isDirty(), this.sharedNode.lastMutator, ThreadX.threadName);
    if (this.sharedObjectStruct.isDirty()) {
      //console.log('_queueMutations: isDirty', ThreadX.threadName);
      this.processDirtyProperties();
    }
    const { mutations } = this;
    this.mutations = {};
    for (const key in mutations) {
      if (Object.prototype.hasOwnProperty.call(mutations, key)) {
        //console.log('_queueMutations: setting', key, this.curProps[key as keyof WritableProps], ThreadX.threadName);
        const value = this.curProps[key as keyof WritableProps];
        // Workaround TypeScript limitation re-assigning to dynamic keys of a class instance:
        // https://github.com/microsoft/TypeScript/issues/53738
        const oldValue = this.sharedObjectStruct[key as keyof WritableProps];
        this.sharedObjectStruct[key as keyof WritableProps] =
          value as unknown as typeof oldValue;
      }
    }
    if (this.waitPromise) {
      this.waitPromise = null;
    }
    let expectedNotifyValue = this.sharedObjectStruct.lastMutator;
    if (this.sharedObjectStruct.isDirty()) {
      //console.log('_queueMutations: notifying other thread', ThreadX.threadName);
      this.sharedObjectStruct.notify(ThreadX.threadId);
      expectedNotifyValue = ThreadX.threadId;
    }
    //console.log('_queueMutations: starting to waitAsync', ThreadX.threadName);
    const waitPromise = this.sharedObjectStruct
      .waitAsync(expectedNotifyValue)
      .then(async (result) => {
        //console.log('_queueMutations: waitAsync resolved and OK', ThreadX.threadName);
        // Only respond if this is the most recent wait promise
        if (this.waitPromise === waitPromise && this.sharedObjectStruct) {
          this.waitPromise = null;
          await this.sharedObjectStruct.lockAsync(async () => {
            this._executeMutations();
          });
        }
      });
    this.waitPromise = waitPromise;
    //console.log('end _queueMutations', this.sharedNode.isDirty(), this.sharedNode.lastMutator, ThreadX.threadName);
  }

  //#region EventEmitter
  private eventListeners: { [eventName: string]: SOEventListener<any>[] } = {};

  on(eventName: string, listener: SOEventListener<this>): void {
    let listeners = this.eventListeners[eventName];
    if (!listeners) {
      listeners = [];
    }
    listeners.push(listener);
    this.eventListeners[eventName] = listeners;
  }

  off(eventName: string, listener: SOEventListener<this>): void {
    const listeners = this.eventListeners[eventName];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  emit(eventName: string, data: any): void {
    const listeners = this.eventListeners[eventName];
    ThreadX.instance.__sharedObjectEmit(this, eventName, data);
    if (!listeners) {
      return;
    }
    [...listeners].forEach((listener) => {
      listener(this, data);
    });
  }

  once(eventName: string, listener: SOEventListener<this>): void {
    const onceListener: SOEventListener<this> = (target: this, data: any) => {
      this.off(eventName, onceListener);
      listener(target, data);
    };
    this.on(eventName, onceListener);
  }
  //#endregion EventEmitter
}
