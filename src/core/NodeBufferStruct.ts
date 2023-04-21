import { BufferStruct, structProp } from '../__threadx/BufferStruct.js';
import { genTypeId } from '../__threadx/buffer-struct-utils.js';

export interface NodeWrittableProps {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  parentId: number;
  zIndex: number;
  text: string;
  src: string;
}

/*
 * Structure:
 * [0]
 *    Int32[0]: RESERVED (for notify)
 * [1]
 *    Int32[1]: RESERVED (for write lock)
 * [2] + [3]
 *    Float64[ID_FLOAT64_INDEX = 1]: Shared Unique ID of the object
 * [4]
 *    Int32[DIRTY_INT32_INDEX = 4]: Dirty Bit Mask 1 (Property Indices 0-31)
 * [5]
 *    Int32[DIRTY_INT32_INDEX + 1 = 5]: Dirty Bit Mask 2 (Property Indices 32-63)
 * [6] + [7]
 *    Float64[3]: x
 * [8] + [9]
 *    Float64[4]: y
 * [10] + [11]
 *    Float64[5]: w
 * [12] + [13]
 *    Float64[6]: h
 * [14] + [15]
 *    Float64[7]: color
 * [16] + [17]
 *    Float64[8]: parentId
 * [18] + [19]
 *    Float64[9]: zIndex
 * [20] - [147] (128 32-bit words = 256 16-bit words = 64 64-bit words)
 *    Uint16[40]: text (255 character string with first 16-bit word being the length)
 */
export class NodeBufferStruct
  extends BufferStruct
  implements NodeWrittableProps
{
  static override readonly typeId = genTypeId('NODE');

  @structProp('number')
  get x(): number {
    return 0;
  }

  set x(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get y(): number {
    return 0;
  }

  set y(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get w(): number {
    return 0;
  }

  set w(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get h(): number {
    return 0;
  }

  set h(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get color(): number {
    return 0;
  }

  set color(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get parentId(): number {
    return 0;
  }

  set parentId(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get zIndex(): number {
    return 0;
  }

  set zIndex(value: number) {
    // Decorator will handle this
  }

  @structProp('string')
  get text(): string {
    return '';
  }

  set text(value: string) {
    // Decorator will handle this
  }

  @structProp('string')
  get src(): string {
    return '';
  }

  set src(value: string) {
    // Decorator will handle this
  }
}
