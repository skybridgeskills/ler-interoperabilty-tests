<script lang="ts">
	import flameLogo from '$lib/assets/flame-logo.svg';
	import { ThemeToggle } from '$lib/components/theme-toggle/index.js';

	import { resolve } from '$app/paths';
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
		<a href={resolve('/')} class="flex items-center gap-2">
			<img src={flameLogo} alt="" class="h-7 w-7" />
			<span class="text-headline-md leading-none text-primary">LIT</span>
			<span class="text-label-md text-muted-foreground">Suite</span>
		</a>

		<nav class="flex items-center gap-4 text-body-md">
			<a href={resolve('/wallet')} class="text-foreground hover:text-primary">Wallet</a>
			<a href={resolve('/verifier')} class="text-foreground hover:text-primary">Verifier</a>
			<a href={resolve('/issuer')} class="text-foreground hover:text-primary">Issuer</a>
			<a href={resolve('/profiles')} class="text-foreground hover:text-primary">Profiles</a>
		</nav>

		<div class="ml-auto">
			<ThemeToggle />
		</div>
	</div>
</header>
