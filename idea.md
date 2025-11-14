# Wraith: Type Safety Concepts

A TypeScript library for compile-time type safety without runtime overhead.

---

## 1. Opaque Types (Branded Types)

### The Problem

TypeScript uses **structural typing** - types are compatible if their structure matches:

```typescript
type UserId = string;
type ProductId = string;

function getUser(id: UserId) { /* ... */ }

const productId: ProductId = "prod_123";
getUser(productId); // ✅ No error! But this is wrong!
```

Even though semantically these should be different, TypeScript sees them both as `string`.

### The Solution

**Opaque types** (also called branded types) add a compile-time "brand" that makes types nominally distinct:

```typescript
type UserId = Opaque<string, 'UserId'>;
type ProductId = Opaque<string, 'ProductId'>;

function getUser(id: UserId) { /* ... */ }

const productId: ProductId = branded("prod_123");
getUser(productId); // ❌ Type error! ProductId is not assignable to UserId
```

### How It Works

The brand exists only at compile time - there's zero runtime overhead:

```typescript
// Internal implementation (simplified)
type Opaque<T, Brand> = T & { readonly __brand: Brand };

// Creating branded values
function branded<T, Brand>(value: T): Opaque<T, Brand> {
  return value as Opaque<T, Brand>;
}

// Unwrapping (when you need the raw value)
function unwrap<T, Brand>(value: Opaque<T, Brand>): T {
  return value as T;
}
```

### Use Cases

- **IDs**: UserId, OrderId, SessionToken
- **Validated Strings**: Email, URL, PhoneNumber
- **Units**: Pixels, Percentage, Milliseconds
- **Security**: SanitizedHtml, HashedPassword

### Benefits

✅ Prevents mixing semantically different values  
✅ Zero runtime cost  
✅ Self-documenting code  
✅ Catches bugs at compile time

---

## 2. Phantom Types

### The Problem

Sometimes you need to track **state** in your types:

```typescript
class File {
  open() { /* ... */ }
  read() { /* ... */ }  // Should only work if file is open!
  close() { /* ... */ }
}

const file = new File();
file.read(); // ❌ Runtime error - file not opened!
```

You could track state with booleans, but that's checked at runtime.

### The Solution

**Phantom types** use type parameters that don't appear in the runtime structure to track state:

```typescript
type File<State extends FileState> = Opaque<FileHandle, State>;

type Closed = Phantom<'Closed'>;
type Opened = Phantom<'Opened'>;

function open(file: File<Closed>): File<Opened> { /* ... */ }
function read(file: File<Opened>): string { /* ... */ }
function close(file: File<Opened>): File<Closed> { /* ... */ }
```

Now the type system enforces the state machine:

```typescript
const file: File<Closed> = createFile();
read(file); // ❌ Compile error! File is closed

const opened = open(file);
read(opened); // ✅ Works!

const closed = close(opened);
read(closed); // ❌ Compile error! File is closed again
```

### How It Works

The `State` parameter is "phantom" - it exists in the type but not at runtime:

```typescript
// Phantom type helper
type Phantom<Tag> = { readonly __phantom: Tag };

// The State parameter affects type checking but not runtime
type File<State> = {
  handle: FileHandle;
  // State doesn't appear here - it's phantom!
} & Phantom<State>;
```

### Use Cases

- **File States**: Opened, Closed, Locked
- **Connection States**: Connected, Disconnected, Reconnecting
- **Request States**: Pending, Authenticated, Authorized
- **Data States**: Raw, Validated, Sanitized
- **Transaction States**: Active, Committed, RolledBack

### Benefits

✅ Enforce state machines at compile time  
✅ Impossible to call methods in wrong state  
✅ No runtime checks needed  
✅ Self-documenting state transitions

---

## 3. Type-Safe Builders

### The Problem

Creating objects with many required fields is error-prone:

```typescript
interface User {
  id: UserId;
  email: Email;
  name: string;
  age: number;
}

// Easy to forget fields
const user: User = {
  id: branded("123"),
  email: branded("a@b.com"),
  // Oops, forgot name and age!
};
```

Or using constructors gets messy:

```typescript
new User(
  branded("123"),
  branded("a@b.com"),
  "Alice",
  30,
  // What was the order again?
);
```

### The Solution

**Type-safe builders** with compile-time validation:

```typescript
const user = builder<User>()
  .id(branded<UserId>("123"))
  .email(branded<Email>("alice@example.com"))
  .name("Alice")
  .age(30)
  .build(); // ✅ Only compiles if all required fields are set

// This won't compile:
const incomplete = builder<User>()
  .name("Bob")
  .build(); // ❌ Error: Missing required fields 'id', 'email', 'age'
```

### How It Works

The builder tracks which fields have been set using **phantom types**:

```typescript
// Simplified implementation
type Builder<T, Built extends keyof T = never> = {
  [K in keyof T]: (value: T[K]) => Builder<T, Built | K>;
} & {
  build: Built extends keyof T
    ? () => T  // All fields set
    : never;   // Some fields missing - can't call build()
};
```

### Advanced Features

**Optional fields:**
```typescript
interface User {
  id: UserId;
  name: string;
  nickname?: string; // Optional
}

const user = builder<User>()
  .id(branded("123"))
  .name("Alice")
  .build(); // ✅ Works! nickname is optional
```

**Dependent fields:**
```typescript
const config = builder<Config>()
  .enableAuth(true)
  .authProvider("oauth") // Only available if enableAuth is true
  .build();
```

**Transformations:**
```typescript
const user = builder<User>()
  .email("ALICE@EXAMPLE.COM")
  .transform('email', (e) => e.toLowerCase()) // Normalize
  .build();
```

### Use Cases

- **Configuration objects**: Database configs, API clients
- **Domain models**: Users, Orders, Products
- **Complex DTOs**: Request/response objects
- **Test data**: Builders with sensible defaults

### Benefits

✅ Fluent, readable API  
✅ Compile-time validation of required fields  
✅ Great IDE autocomplete  
✅ Impossible to forget required fields  
✅ Named parameters (better than positional)

---

## How They Work Together

These three concepts complement each other beautifully:

```typescript
// 1. Define opaque types for domain primitives
type UserId = Opaque<string, 'UserId'>;
type Email = Opaque<string, 'Email'>;

// 2. Define phantom types for state
type Unverified = Phantom<'Unverified'>;
type Verified = Phantom<'Verified'>;

// 3. Use builders to construct complex types safely
interface User<State extends UserState> {
  id: UserId;
  email: Email;
  name: string;
  state: State;
}

const newUser = builder<User<Unverified>>()
  .id(branded<UserId>("usr_123"))
  .email(branded<Email>("alice@example.com"))
  .name("Alice")
  .state(phantom<Unverified>())
  .build();

// Type system prevents calling verified-only functions
function sendEmail(user: User<Verified>) { /* ... */ }

sendEmail(newUser); // ❌ Compile error! User is unverified

const verified = verify(newUser); // Returns User<Verified>
sendEmail(verified); // ✅ Works!
```

---

## Core Principles

All three concepts share common principles:

1. **Compile-time only**: Zero runtime overhead
2. **Type-level programming**: Use TypeScript's type system to enforce invariants
3. **Make invalid states unrepresentable**: If it compiles, it's correct
4. **Developer experience**: Great IDE support and clear error messages

---

## Getting Started

```bash
npm install wraith
```

```typescript
import { branded, phantom, builder } from 'wraith';

// Start with opaque types
type UserId = Opaque<string, 'UserId'>;
const id = branded<UserId>("123");

// Add phantom types for state tracking
type File<S> = Opaque<FileHandle, S>;
type Opened = Phantom<'Opened'>;

// Use builders for construction
const user = builder<User>()
  .id(id)
  .name("Alice")
  .build();
```

---

## Philosophy

**Wraith makes TypeScript's type system work harder so you don't have to.**

By encoding constraints in types rather than runtime checks, you get:
- Faster code (no runtime validation)
- Safer code (caught at compile time)
- Clearer code (types document intent)
- Better DX (IDE catches errors immediately)

The name "Wraith" reflects the phantom nature - these types are powerful guards that exist only in the type realm, invisible at runtime but protecting you from bugs.
