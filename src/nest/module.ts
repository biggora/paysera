import type { DynamicModule, FactoryProvider, ModuleMetadata, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';

import { PayseraClient } from '../client.js';
import type { PayseraClientOptions } from '../core/http-client.js';
import { PAYSERA_CLIENT, PAYSERA_MODULE_OPTIONS } from './tokens.js';
import { PayseraWebhookVerifier } from './webhook-verifier.js';

export type PayseraModuleAsyncOptions = {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider<PayseraClientOptions>['inject'];
  useFactory: (...args: any[]) => Promise<PayseraClientOptions> | PayseraClientOptions;
};

function createClientProvider(): Provider {
  return {
    provide: PAYSERA_CLIENT,
    inject: [PAYSERA_MODULE_OPTIONS],
    useFactory: (options: PayseraClientOptions) => new PayseraClient(options),
  };
}

@Module({})
export class PayseraModule {
  static forRoot(options: PayseraClientOptions): DynamicModule {
    return {
      module: PayseraModule,
      providers: [
        {
          provide: PAYSERA_MODULE_OPTIONS,
          useValue: options,
        },
        createClientProvider(),
        PayseraWebhookVerifier,
      ],
      exports: [PAYSERA_CLIENT, PayseraWebhookVerifier],
    };
  }

  static forRootAsync(options: PayseraModuleAsyncOptions): DynamicModule {
    return {
      module: PayseraModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: PAYSERA_MODULE_OPTIONS,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        createClientProvider(),
        PayseraWebhookVerifier,
      ],
      exports: [PAYSERA_CLIENT, PayseraWebhookVerifier],
    };
  }
}
