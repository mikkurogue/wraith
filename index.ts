export namespace Wraith {
  /** 
   * Makes a type opaque by branding it with a unique signature.
  */
  export type Opaque<T, Brand> = T & { __brand: Brand };
  /** 
   * A phantom type that carries type information without affecting runtime behavior.
  */
  export type Phantom<Tag> = { __phantom: Tag };

  /** 
   * Creates an opaque type from a given value.
  */
  export function makeOpaque<T, Brand>(value: T): Wraith.Opaque<T, Brand> {
    return value as Wraith.Opaque<T, Brand>;
  }

  /** 
   * Reveal or unwrap an opaque type to return the original value.
  */
  export function reveal<T, Brand>(opaque: Wraith.Opaque<T, Brand>): T {
    return opaque as T;
  }
}
