import type { z } from 'zod';

/**
 * Creates a factory function for a Zod schema, allowing ergonomic of
 * object creation.
 *
 * Example:
 *
 * ```ts
 * // user-resource.gen.ts
 * export const User = ZodFactory(z.object({
 *   id: z.string().uuid().default(() => crypto.randomUUID()),
 *   name: z.string(),
 *   age: z.number(),
 * }));
 * export type User = ReturnType<typeof User>;
 *
 * // main.ts
 * const user: User = User({ name: 'John', age: 30 });
 * ```
 *
 * @param schema - The Zod schema to create a factory for.
 * @returns A Zod factory that can be used to create a Zod schema.
 */
export function ZodFactory<TSchema extends z.ZodTypeAny, TExtra>(schema: TSchema, extra?: TExtra) {
	return Object.assign((params: z.input<TSchema>) => schema.parse(params), {
		schema,
		...extra
	}) as {
		(params: z.input<TSchema>): z.output<TSchema>;
		schema: TSchema;
	} & (void extends TExtra ? Record<never, never> : TExtra);
}
