import { ThreadX } from './ThreadX.js';
import { stringifyTypeId } from './buffer-struct-utils.js';

const TYPEID_INT32_INDEX = 0;
const NOTIFY_INT32_INDEX = 1;
const LOCK_INT32_INDEX = 2;
const DIRTY_INT32_INDEX = 6;
const ID_FLOAT64_INDEX = 2;

const MAX_STRING_SIZE = 255;

export type BufferStructConstructor<
  WritableProps = object,
  T extends BufferStruct = BufferStruct,
> = {
  new (): T & WritableProps;
  propDefs: PropDef[];
};

function valueIsType(
  expectedType: 'number',
  type: string,
  value: unknown,
): value is number;
function valueIsType(
  expectedType: 'int32',
  type: string,
  value: unknown,
): value is number;
function valueIsType(
  expectedType: 'string',
  type: string,
  value: unknown,
): value is string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function valueIsType(
  expectedType: string,
  type: string,
  value: unknown,
): boolean {
  return expectedType === type;
}

function valuesAreEqual(a: number, b: unknown): b is number;
function valuesAreEqual(a: string, b: unknown): b is string;
function valuesAreEqual(a: string | number, b: unknown): boolean {
  return a === b;
}

export function structProp(type: 'string' | 'number' | 'int32') {
  return function (
    target: BufferStruct,
    key: string,
    descriptor: PropertyDescriptor,
  ): void {
    const constructor = target.constructor as typeof BufferStruct;
    let byteOffset = constructor.size;
    let offset = 0;
    let byteSize = 0;
    if (type === 'string') {
      byteOffset += byteOffset % 2;
      offset = byteOffset / 2;
      byteSize = (MAX_STRING_SIZE + 1) * 2; // 16-bits for size then 255 16-bit characters
    } else if (type === 'int32') {
      byteOffset += byteOffset % 4;
      offset = byteOffset / 4;
      byteSize = 4;
    } else if (type === 'number') {
      byteOffset += byteOffset % 8;
      offset = byteOffset / 8;
      byteSize = 8;
    }

    const propDefs = constructor.propDefs;
    const propNum = propDefs.length;
    const propDef = {
      propNum,
      name: key,
      type,
      byteOffset: byteOffset,
      offset: offset,
      byteSize: byteSize,
    };
    propDefs.push(propDef);

    constructor.size += byteSize;

    // TODO: Move the descriptors to the prototype to avoid code duplication/closures
    descriptor.get = function (this: BufferStruct) {
      if (type === 'string') {
        const length = this.uint16array[offset];
        if (!length) return '';
        if (length > MAX_STRING_SIZE) {
          // This should never happen because we truncate the string when setting it
          throw new Error(
            `get SharedObject.${key}: Text length is too long. Length: ${length}`,
          );
        }
        return String.fromCharCode(
          ...this.uint16array.slice(offset + 1, offset + 1 + length),
        );
      } else if (type === 'int32') {
        return this.int32array[offset];
      } else if (type === 'number') {
        return this.float64array[offset];
      }
    };

    descriptor.set = function (this: BufferStruct, value: unknown) {
      if (valueIsType('string', type, value)) {
        if (!valuesAreEqual(value, this[key as keyof BufferStruct])) {
          this.setDirty(propNum);
          // Copy string into shared memory in the most efficient way possible
          let length = value.length;
          if (length > MAX_STRING_SIZE) {
            console.error(
              `set SharedObject.${key}: Text length is too long. Truncating...`,
              length,
            );
            length = MAX_STRING_SIZE;
          }
          this.uint16array[offset] = length;
          const startOffset = offset + 1;
          const endOffset = startOffset + length;
          let charIndex = 0;
          for (let i = startOffset; i < endOffset; i++) {
            this.uint16array[i] = value.charCodeAt(charIndex++);
          }
        }
      } else if (valueIsType('int32', type, value)) {
        if (!valuesAreEqual(value, this[key as keyof BufferStruct])) {
          this.setDirty(propNum);
          this.int32array[offset] = value;
        }
      } else if (valueIsType('number', type, value)) {
        if (!valuesAreEqual(value, this[key as keyof BufferStruct])) {
          this.setDirty(propNum);
          this.float64array[offset] = value;
        }
      }
    };
  };
}

interface PropDef {
  propNum: number;
  name: string;
  type: 'string' | 'number' | 'int32';
  byteOffset: number;
  offset: number;
  byteSize: number;
}

let counter = 1;

function generateUniqueId(): number {
  return ThreadX.threadId * 10000000000000 + counter++;
}

/**
 * BufferStruct Header Structure:
 * Int32[0]
 *   Type ID: Type of object (32-bit identifier)
 * Int32[1]
 *    Notify / Last Mutator Thread ID
 * Int32[2]
 *    Lock
 * Int32[3]
 *    RESERVED (64-bit align)
 * Int32[4 - 5] / Float64[ID_FLOAT64_INDEX = 2]
 *    Shared Unique ID of the object
 * Int32[DIRTY_INT32_INDEX = 6]
 *    Dirty Bit Mask 1 (Property Indices 0-31)
 * Int32[DIRTY_INT32_INDEX + 1 = 7]
 *    Dirty Bit Mask 2 (Property Indices 32-63)
 *
 * HEADER SIZE MUST BE A MULTIPLE OF 8 BYTES (64-BIT ALIGNMENT)
 */
export abstract class BufferStruct {
  buffer: SharedArrayBuffer;
  // Lock ID that is a valid 32-bit random integer
  protected lockId = Math.floor(Math.random() * 0xffffffff);
  protected uint16array: Uint16Array;
  protected int32array: Int32Array;
  protected float64array: Float64Array;

  static staticInitialized = false;
  static typeId = 0;
  static typeIdStr = '';
  static size = 8 * 4; // Header size
  static propDefs: PropDef[] = [];

  constructor(buffer?: SharedArrayBuffer) {
    const constructor = this.constructor as typeof BufferStruct;
    if (!constructor.staticInitialized) {
      constructor.staticInit();
    }
    const isNew = !buffer;
    if (!buffer) {
      buffer = new SharedArrayBuffer(constructor.size);
    }

    this.buffer = buffer;
    this.uint16array = new Uint16Array(buffer);
    this.int32array = new Int32Array(buffer);
    this.float64array = new Float64Array(buffer);

    const typeId = constructor.typeId;

    // If this is a new buffer, initialize the TypeID and ID
    if (isNew) {
      this.int32array[TYPEID_INT32_INDEX] = typeId;
      this.float64array[ID_FLOAT64_INDEX] = generateUniqueId();
    } else if (this.int32array[TYPEID_INT32_INDEX] !== typeId) {
      // If this is an existing buffer, verify the TypeID is the same as expected
      // by this class
      throw new Error(
        `BufferStruct: TypeId mismatch. Expected '${
          constructor.typeIdStr
        }', got '${stringifyTypeId(this.int32array[TYPEID_INT32_INDEX]!)}'`,
      );
    }
  }

  /**
   * Safely extract the TypeID from any SharedArrayBuffer (as if it is a BufferStruct)
   *
   * @remarks
   * Does not check if the TypeID is valid however it does a basic sanity check to
   * ensure the buffer is large enough to contain the TypeID at Int32[TYPEID_INT32_INDEX].
   *
   * If the buffer is found to be invalid, 0 is returned.
   *
   * @param buffer
   * @returns
   */
  static extractTypeId(buffer: SharedArrayBuffer): number {
    if (
      buffer.byteLength < TYPEID_INT32_INDEX * 4 ||
      buffer.byteLength % 4 !== 0
    ) {
      return 0;
    }
    return new Int32Array(buffer)[TYPEID_INT32_INDEX] || 0;
  }

  private static staticInit() {
    const typeIdStr = stringifyTypeId(this.typeId);
    if (typeIdStr === null) {
      throw new Error(
        'BufferStruct.typeId must be set to a valid 32-bit integer',
      );
    }
    this.typeIdStr = typeIdStr;
    this.staticInitialized = true;
  }

  protected setDirty(propIndex: number) {
    const dirtyWordOffset = Math.floor(propIndex / 32);
    const dirtyBitOffset = propIndex - dirtyWordOffset * 32;
    this.int32array[DIRTY_INT32_INDEX + dirtyWordOffset] =
      this.int32array[DIRTY_INT32_INDEX + dirtyWordOffset]! |
      (1 << dirtyBitOffset);
  }

  resetDirty() {
    // TODO: Do we need to use atomics here?
    this.int32array[NOTIFY_INT32_INDEX] = 0;
    this.int32array[DIRTY_INT32_INDEX] = 0;
    this.int32array[DIRTY_INT32_INDEX + 1] = 0;
  }

  isDirty(propIndex?: number): boolean {
    // If we're the last mutator, then consider the data clean
    if (this.lastMutator === ThreadX.threadId) {
      return false;
    }
    if (propIndex !== undefined) {
      const dirtyWordOffset = Math.floor(propIndex / 32);
      const dirtyBitOffset = propIndex - dirtyWordOffset * 32;
      return !!(
        this.int32array[DIRTY_INT32_INDEX + dirtyWordOffset]! &
        (1 << dirtyBitOffset)
      );
    }
    return !!(
      this.int32array[DIRTY_INT32_INDEX] ||
      this.int32array[DIRTY_INT32_INDEX + 1]
    );
  }

  get typeId(): number {
    // Atomic load not required here because typeId is constant
    return this.int32array[TYPEID_INT32_INDEX]!;
  }

  get id(): number {
    // Atomic load not required here because id is constant
    return this.float64array[ID_FLOAT64_INDEX]!;
  }

  get lastMutator(): number {
    return Atomics.load(this.int32array, NOTIFY_INT32_INDEX);
  }

  lock<T>(callback: () => T): T {
    let origLock = Atomics.compareExchange(
      this.int32array,
      LOCK_INT32_INDEX,
      0,
      this.lockId,
    );
    while (origLock !== 0) {
      Atomics.wait(this.int32array, LOCK_INT32_INDEX, origLock);
      origLock = Atomics.compareExchange(
        this.int32array,
        LOCK_INT32_INDEX,
        0,
        this.lockId,
      );
    }
    const result = callback();
    Atomics.store(this.int32array, LOCK_INT32_INDEX, 0);
    Atomics.notify(this.int32array, LOCK_INT32_INDEX);
    return result;
  }

  async lockAsync<T>(callback: (...args: any[]) => Promise<T>): Promise<T> {
    let origLock = Atomics.compareExchange(
      this.int32array,
      LOCK_INT32_INDEX,
      0,
      this.lockId,
    );
    while (origLock !== 0) {
      const result = Atomics.waitAsync(
        this.int32array,
        LOCK_INT32_INDEX,
        origLock,
      );
      await result.value;
      origLock = Atomics.compareExchange(
        this.int32array,
        LOCK_INT32_INDEX,
        0,
        this.lockId,
      );
    }
    const result = await callback();
    Atomics.store(this.int32array, LOCK_INT32_INDEX, 0);
    Atomics.notify(this.int32array, LOCK_INT32_INDEX);
    return result;
  }

  notify(value?: number) {
    if (value !== undefined) {
      Atomics.store(this.int32array, NOTIFY_INT32_INDEX, value);
    }
    return Atomics.notify(this.int32array, NOTIFY_INT32_INDEX);
  }

  wait(expectedValue: number, timeout = Infinity) {
    const result = Atomics.wait(
      this.int32array,
      NOTIFY_INT32_INDEX,
      expectedValue,
      timeout,
    );
    return result;
  }

  async waitAsync(
    expectedValue: number,
    timeout = Infinity,
  ): Promise<'not-equal' | 'timed-out' | 'ok'> {
    const result = Atomics.waitAsync(
      this.int32array,
      NOTIFY_INT32_INDEX,
      expectedValue,
      timeout,
    );
    return result.value;
  }
}
