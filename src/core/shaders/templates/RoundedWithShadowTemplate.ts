/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import { RoundedTemplate, type RoundedProps } from './RoundedTemplate.js';
import type { PrefixedType } from '../utils.js';
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
    props,
  };
