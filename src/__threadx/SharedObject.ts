import type { IEventEmitter } from './IEventEmitter.js';
import type { BufferStruct, BufferStructConstructor } from './BufferStruct.js';
import { ThreadX } from './ThreadX.js';

export class SharedObject<
  WritableProps extends object = object,
  InstanceT extends BufferStruct & WritableProps = BufferStruct & WritableProps,
  T extends BufferStructConstructor<
    WritableProps,
    InstanceT
  > = BufferStructConstructor<WritableProps, InstanceT>,
> implements IEventEmitter
{
  private sharedObjectStruct: InstanceT | null;
  protected mutations: { [s in keyof WritableProps]?: true };
  private waitPromise: Promise<void> | null = null;
  private mutationsQueued = false;
  private dirtyProcessCount = 0;
  static staticConstructed = false;
  private _id: number;
  private _typeId: number;
  private initialized = false;
  private destroying = false;

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
    if (sharedObject.destroying || !sharedObject.sharedObjectStruct) {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const prototype = Object.getPrototypeOf(this);
      Object.keys(curProps).forEach((key) => {
        Object.defineProperty(prototype, key, {
          get: function (this: SharedObject<WritableProps>) {
            return this.curProps[key as keyof WritableProps];
          },
          set: function (this: SharedObject<WritableProps>, value: unknown) {
            (this.curProps[key as keyof WritableProps] as unknown) = value;
            this.mutations[key as keyof WritableProps] = true;
            this.queueMutations();
          },
        });
      });
    }

    this.mutations = {};
    this._executeMutations();
    this.initialized = true;
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
        // If this property has a pending mutation from this thread, then
        // cancel it. The mutation from the other thread that has already
        // been applied to the SharedArrayBuffer will take precedence.
        delete mutations[propName];
        const oldValue = curProps[propName];
        // Apply the mutation from the other thread
        curProps[propName] = sharedObjectStruct[propName];
        // Don't call onPropertyChange during the initialization process
        if (this.initialized) {
          this.onPropertyChange(
            propName,
            sharedObjectStruct[propName],
            oldValue,
          );
        }
      }
    });
    sharedObjectStruct.resetDirty();
  }

  onPropertyChange(
    propName: keyof WritableProps,
    newValue: any,
    oldValue: any,
  ): void {
    // console.log(`onPropertyChange: ${propName} = ${value} (${this.dirtyProcessCount}, ${ThreadX.threadName)`);
  }

  queueMutations(): void {
    if (this.mutationsQueued) {
      return;
    }
    this.mutationsQueued = true;
    queueMicrotask(() => {
      this.mutationsQueued = false;
      // If the SharedObject has been destroyed, then forget about processing
      // any mutations.
      if (!this.sharedObjectStruct) {
        return;
      }
      this.mutationMicrotask().catch(console.error);
    });
  }

  private async mutationMicrotask() {
    if (!this.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    await this.sharedObjectStruct.lockAsync(async () => {
      this._executeMutations();
    });
    if (this.destroying) {
      this.finishDestroy();
    }
  }

  public flush(): void {
    if (this.destroying || !this.sharedObjectStruct) {
      throw new Error('SharedObject was destroyed');
    }
    this.sharedObjectStruct.lock(() => {
      this._executeMutations();
    });
  }

  /**
   * Called when the SharedObject is being destroyed.
   *
   * @remarks
   * This is an opportunity to clean up anything just prior to the SharedObject
   * being completely destroyed. Shared mutations are allowed in this method.
   *
   * IMPORTANT:
   * `super.onDestroy()` must be called at the END of any subclass override to
   * ensure proper cleanup.
   */
  protected onDestroy(): void {
    // Implement in subclass
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
    if (this.destroying || !struct) {
      return;
    }
    this.emit('beforeDestroy', {}, { localOnly: true });
    this.destroying = true;
    this.onDestroy();
    // The remainter of the destroy process (this.finishDestroy) is called
    // after the next set of mutations is processed. This is to ensure that
    // any final mutations that are queued up are sent to the opposite thread
    // before the SharedObject is destroyed on this thread.
    this.queueMutations();
  }

  private finishDestroy(): void {
    const struct = this.sharedObjectStruct;
    if (!this.destroying || !struct) {
      return;
    }

    // Remove this object from ThreadX
    // Silently because ThreadX may already have been removed if this object
    // is being destroyed because the current thread was told to forget about it.
    ThreadX.instance
      .forgetObjects([this], { silent: true })
      .catch(console.error);

    // Release the reference to the underlying BufferStruct/SharedArrayBuffer
    this.sharedObjectStruct = null;
    // Submit a notify in order to wake up self or other thread if waiting
    // on the struct. Need to do this otherwise memory leaks.
    struct.notify();
    // Emit the afterDestroy event
    this.emit('afterDestroy', {}, { localOnly: true });
    // Remove all event listeners
    this.eventListeners = {};
  }

  get isDestroyed(): boolean {
    return this.sharedObjectStruct === null;
  }

  private _executeMutations(): void {
    if (!this.sharedObjectStruct) {
      // SharedObject was destroyed so there's nothing to do
      return;
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
          await this.mutationMicrotask();
        }
      });
    this.waitPromise = waitPromise;
    //console.log('end _queueMutations', this.sharedNode.isDirty(), this.sharedNode.lastMutator, ThreadX.threadName);
  }

  //#region EventEmitter
  private eventListeners: { [eventName: string]: any } = {};

  on(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let listeners = this.eventListeners[event];
    if (!listeners) {
      listeners = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    listeners.push(listener);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.eventListeners[event] = listeners;
  }

  off(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      listeners.splice(index, 1);
    }
  }

  once(event: string, listener: (target: any, data: any) => void): void {
    const onceListener = (target: any, data: any) => {
      this.off(event, onceListener);
      listener(target, data);
    };
    this.on(event, onceListener);
  }

  emit(
    event: string,
    data: Record<string, unknown>,
    options: { localOnly?: boolean } = {},
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!options.localOnly) {
      // Emit on opposite thread (if shared)
      ThreadX.instance.__sharedObjectEmit(this, event, data);
    }
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    [...listeners].forEach((listener) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      listener(this, data);
    });
  }
  //#endregion EventEmitter
}
