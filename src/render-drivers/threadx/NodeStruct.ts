import { BufferStruct, structProp, genTypeId } from '@lightningjs/threadx';

export interface NodeStructWritableProps {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
  color: number;
  parentId: number;
  zIndex: number;
  text: string;
}

export class NodeStruct
  extends BufferStruct
  implements NodeStructWritableProps
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
  get alpha(): number {
    return 0;
  }

  set alpha(value: number) {
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
}
