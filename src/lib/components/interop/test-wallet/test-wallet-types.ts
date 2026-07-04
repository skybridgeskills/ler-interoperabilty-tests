import type { Snippet } from 'svelte';

import type {
	WalletActivity,
	WalletActivityStatus,
	WalletArtifact
} from '$lib/interop/wallet-activity.js';

// The wallet-activity model is the normalized, client-safe schema owned by the
// server-side run-response (see `$lib/interop/wallet-activity.ts` + the ADR
// `docs/adr/2026-07-03-normalized-wallet-run-response.md`). The base component
// consumes those types directly so the presentational surface and the endpoints
// speak one vocabulary.
export type { WalletActivityStatus, WalletArtifact };

/** One ordered line in the wallet's activity/messages list (alias of the normalized entry). */
export type WalletActivityEntry = WalletActivity;

/** Whether an entry is a protocol interaction or a verification check. */
export type WalletActivityKind = WalletActivity['kind'];

/** Lifecycle state of the wallet, drives the header chip + button copy. */
export type TestWalletState = 'idle' | 'running' | 'done' | 'error';

/** Props for the presentational {@link TestWallet} base. Copy/settings are all
 * parametrized — no protocol strings live in the base. */
export type TestWalletProps = {
	/** Header identity label. */
	walletName?: string;
	/** Lifecycle state driving the header chip + action copy. */
	state?: TestWalletState;
	/** Semantic label for the initiation input, e.g. `Interaction URL`. */
	inputLabel: string;
	inputPlaceholder?: string;
	inputType?: 'url' | 'text';
	/** Render the initiation input as a multiline `<textarea>` (the paste variant). */
	multiline?: boolean;
	/** Bindable initiation input value. */
	value?: string;
	/** Semantic submit label, e.g. `Run interaction`. */
	actionLabel: string;
	/** Submit label while busy, e.g. `Running interaction…`. */
	runningLabel?: string;
	/** Submit label once a run finished, e.g. `Run again`. */
	againLabel?: string;
	busy?: boolean;
	canRun?: boolean;
	activity?: WalletActivityEntry[];
	artifacts?: WalletArtifact[];
	/** Optional blurb rendered under the header. */
	intro?: Snippet;
	/** Optional wallet-settings contents; section is omitted when absent. */
	settings?: Snippet;
	/** Optional extra buttons in the initiation action row (e.g. "Load sample"). */
	secondaryActions?: Snippet;
	/** Optional placeholder shown before the first run. */
	emptyActivity?: Snippet;
	onRun?: () => void | Promise<void>;
	onReset?: () => void;
};
