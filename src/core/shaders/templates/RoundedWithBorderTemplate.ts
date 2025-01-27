import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import { getBorderProps, type BorderProps } from './BorderTemplate.js';
import { RoundedTemplate, type RoundedProps } from './RoundedTemplate.js';
import type { PrefixedType } from './shaderUtils.js';

export type RoundedWithBorderProps = RoundedProps &
  PrefixedType<BorderProps, 'border'>;

const props = Object.assign(
  {},
  RoundedTemplate.props,
  getBorderProps('border'),
) as RoundedWithBorderProps;

export const RoundedWithBorderTemplate: CoreShaderType<RoundedWithBorderProps> =
  {
    name: 'RoundedWithBorder',
    props,
  };
