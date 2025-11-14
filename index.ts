/**
 * Wraith provides utilities for creating and managing opaque types and phantom types in TypeScript.
 * TODO:
 * - Add builder support for generating chainable api's for opaque and phantom types.
 */
export namespace Wraith {
	/**
	 * Makes a type opaque by branding it with a unique signature.
	 */
	export type BrandKey<Brand extends string> = `__wraith_brand_${Brand}`;
	export type Opaque<T, Brand extends string> = T & {
		[K in BrandKey<Brand>]: Brand;
	};
	// Legacy alias

	/**
	 * A builder for creating and manipulating opaque types in a chainable manner.
	 */
	export type OpaqueBuilder<T, Brand extends string> = {
		item: Wraith.Opaque<T, Brand>;
		and: (
			fn: (opaque: Wraith.Opaque<T, Brand>) => Wraith.Opaque<T, Brand>,
		) => OpaqueBuilder<T, Brand>;
		done: () => Wraith.Opaque<T, Brand>;
	};

	/**
	 * A phantom type that carries type information without affecting runtime behavior.
	 */
	export type Phantom<Tag> = { __phantom: Tag };

	/**
	 * Creates an opaque type from a given value.
	 */
	export function makeOpaque<T, Brand extends string>(
		value: T,
	): Wraith.Opaque<T, Brand> {
		return value as Wraith.Opaque<T, Brand>;
	}

	/**
	 * Reveal or unwrap an opaque type to return the original value.
	 */
	export function reveal<T, Brand extends string>(
		opaque: Wraith.Opaque<T, Brand>,
	): T {
		return opaque as T;
	}

	export function build<T, Brand extends string>(
		opaque: Wraith.Opaque<T, Brand>,
	): OpaqueBuilder<T, Brand> {
		return {
			item: opaque,
			and(fn) {
				const next = fn(this.item);
				return build<T, Brand>(next);
			},
			done() {
				return this.item;
			},
		};
	}

	/**
	 * Builder convenience: transform underlying raw value while keeping brand.
	 */
	export function map<T, Brand extends string>(
		builder: OpaqueBuilder<T, Brand>,
		fn: (raw: T) => T,
	): OpaqueBuilder<T, Brand> {
		const raw = reveal(builder.item);
		const next = makeOpaque<T, Brand>(fn(raw));
		return build(next);
	}
}

// example
// both User and product have the same structure but are different types
// typescript allows us to create functions that says "take a User" and we can provide it a product and it is still valid

type CoreEntity = { id: number; name: string };

// this is where opaque types come in handy as they mark types with similar structures as branded/distinct types
type User = Wraith.Opaque<CoreEntity, "User">;
// type Product = Wraith.Opaque<CoreEntity, "Product">; // unused example

function insertUser(user: User) {
	console.log("Inserting user:", user);
}

// manually define the user opaque type
// legacy manual opaque example (would error if uncommented due to key change)
// const user: User = { id: 1, name: "Alice", __wraith_brand_User: "User" } as User;
const user: User = Wraith.makeOpaque<CoreEntity, "User">({
	id: 1,
	name: "Alice",
});
// use the wraith utility to create an opaque type without having to manually add the __brand
const makeUserOpaque: User = Wraith.makeOpaque<CoreEntity, "User">({
	id: 1,
	name: "Alice",
});

// const coreEntityBasedUser: CoreEntity = { id: 1, name: "Alice" }; // unused example

// this is the intended use of a function for the user
insertUser(Wraith.makeOpaque<CoreEntity, "User">({ id: 1, name: "Alice" }));
// using the variable that holds the opaque user type
insertUser(Wraith.makeOpaque<CoreEntity, "User">(makeUserOpaque));
// using the variable that holds the manually defined opaque user type
insertUser(user);
// using the core entity based user will cause a typescript error as it is not branded
// insertUser(coreEntityBasedUser); // expected error example
// this will cause a typescript error as we are trying to provide a product where a user is expected
insertUser(Wraith.makeOpaque<CoreEntity, "Product">({ id: 2, name: "Gadget" })); // expected error example
