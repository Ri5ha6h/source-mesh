import { Effect } from 'effect';

export const traced = <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
  Effect.withSpan(name)(effect);
