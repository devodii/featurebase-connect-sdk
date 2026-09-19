/**
 * Compile-time type equality check. `Expect<Equal<A, B>>` fails to compile
 * if A and B aren't exactly the same type, catching generic regressions
 * that a runtime test alone would miss.
 */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type Expect<T extends true> = T;
