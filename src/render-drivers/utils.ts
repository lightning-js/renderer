import { CoreExtension } from '../../exports/core-api.js';
import type { Stage } from '../core/Stage.js';
import type { CustomDataMap } from '../main-api/INode.js';

/**
 * Type guard that checks if a Class extends CoreExtension.
 *
 * @param Class
 * @returns
 */
export function classExtendsCoreExtension(
  Class: unknown,
): Class is new () => CoreExtension {
  return (Class as typeof CoreExtension).prototype instanceof CoreExtension;
}

export async function loadCoreExtension(
  coreExtensionModule: string,
  stage: Stage,
) {
  let module: {
    default?: unknown;
  };
  try {
    console.log('Loading core extension', coreExtensionModule);
    module = (await import(
      coreExtensionModule /* @vite-ignore */
    )) as typeof module;
  } catch (e: unknown) {
    console.error(
      `The core extension module at '${coreExtensionModule}' could not be loaded.`,
    );
    console.error(e);
    return;
  }
  if (!module.default) {
    console.error(
      `The core extension module at '${coreExtensionModule}' does not have a default export.`,
    );
    return;
  }
  const ExtensionClass = module.default;
  if (classExtendsCoreExtension(ExtensionClass)) {
    const coreExtension = new ExtensionClass();
    try {
      await coreExtension.run(stage);
    } catch (e: unknown) {
      console.error(
        `The core extension at '${coreExtensionModule}' threw an error.`,
      );
      console.error(e);
    }
  } else {
    console.error(
      `The core extension at '${coreExtensionModule}' does not extend CoreExtension.`,
    );
  }
}

export function santizeCustomDataMap(d: CustomDataMap): CustomDataMap {
  for (const key in d) {
    const value = d[key];

    if (typeof value === 'string' && value.length > 2048) {
      console.warn(
        `Custom Data value for ${key} is too long, it will be truncated to 2048 characters`,
      );
      d[key] = value.substring(0, 2048);
    }

    if (
      typeof value !== 'boolean' &&
      typeof value !== 'string' &&
      typeof value !== 'number'
    ) {
      console.warn(
        `Custom Data value for ${key} is not a boolean, string, or number, it will be ignored`,
      );
      delete d[key];
    }
  }

  return d;
}
