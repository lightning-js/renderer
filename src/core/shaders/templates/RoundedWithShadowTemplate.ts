import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import { RoundedTemplate, type RoundedProps } from './RoundedTemplate.js';
import type { PrefixedType } from './shaderUtils.js';
import { getShadowProps, type ShadowProps } from './ShadowTemplate.js';

export type RoundedWithShadowProps = RoundedProps &
  PrefixedType<ShadowProps, 'shadow'>;

const props = Object.assign(
  {},
  RoundedTemplate.props,
  getShadowProps('shadow'),
) as RoundedWithShadowProps;

export const RoundedWithShadowTemplate: CoreShaderType<RoundedWithShadowProps> =
  {
    name: 'RoundedWithShadow',
    props,
  };
