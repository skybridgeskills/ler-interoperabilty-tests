/**
 * Throws an error with the given message or error object.
 * Useful for asserting impossible conditions.
 */
export function panic(msgOrErr: string | Error): never {
	throw msgOrErr instanceof Error ? msgOrErr : new Error(msgOrErr);
}

/**
 * Throws an error with multiple lines of text.
 */
export function panicLines(...lines: string[]): never {
	throw new Error(lines.join('\n'));
}
