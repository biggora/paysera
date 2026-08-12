import { Inject } from '@nestjs/common';

export const PAYSERA_CLIENT = Symbol('PAYSERA_CLIENT');
export const PAYSERA_MODULE_OPTIONS = Symbol('PAYSERA_MODULE_OPTIONS');

export function InjectPayseraClient(): ParameterDecorator {
  return Inject(PAYSERA_CLIENT);
}
