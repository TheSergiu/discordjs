/**
 Copyright Findie 2021
 */

export function assertObjectRecordIntegrity<T>() {
  return <Keys extends string>(object: Record<Keys, T>) => object;
}
