import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import { getBorderProps, type BorderProps } from './BorderTemplate.js';
import { RoundedTemplate, type RoundedProps } from './RoundedTemplate.js';
import type { PrefixedType } from './shaderUtils.js';
import { getShadowProps, type ShadowProps } from './ShadowTemplate.js';

export type RoundedWithBorderAndShadowProps = RoundedProps &
  PrefixedType<BorderProps, 'border'> &
  PrefixedType<ShadowProps, 'shadow'>;

const props = Object.assign(
  {},
  RoundedTemplate.props,
  getBorderProps('border'),
  getShadowProps('shadow'),
) as RoundedWithBorderAndShadowProps;

export const RoundedWithBorderAndShadowTemplate: CoreShaderType<RoundedWithBorderAndShadowProps> =
  {
    name: 'RoundedWithBorderAndShadow',
    props,
  };
