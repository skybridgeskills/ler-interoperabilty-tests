<script lang="ts">
	import flameLogo from '$lib/assets/flame-logo.svg';
	import { ThemeToggle } from '$lib/components/theme-toggle/index.js';

	import { resolve } from '$app/paths';
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 print:hidden"
>
	<!--
		On small screens the bar wraps: logo + theme toggle stay on the first row (toggle right)
		and the nav wraps onto its own row below; at `sm:` and up it is the single 56px row
		(logo · nav · toggle).
	-->
	<div
		class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:h-14 sm:flex-nowrap sm:py-0"
	>
		<a href={resolve('/')} class="order-1 flex items-center gap-2 sm:order-none">
			<img src={flameLogo} alt="" class="h-7 w-7" />
			<span class="text-headline-md leading-none text-primary">LER</span>
			<span class="text-label-md text-muted-foreground">Tests</span>
		</a>

		<nav class="order-3 flex w-full items-center gap-4 text-body-md sm:order-none sm:w-auto">
			<a href={resolve('/wallet')} class="text-foreground hover:text-primary">Wallet</a>
			<a href={resolve('/verifier')} class="text-foreground hover:text-primary">Verifier</a>
			<a href={resolve('/issuer')} class="text-foreground hover:text-primary">Issuer</a>
			<a href={resolve('/profiles')} class="text-foreground hover:text-primary">Profiles</a>
			<a href={resolve('/about')} class="text-foreground hover:text-primary">About</a>
		</nav>

		<div class="order-2 ml-auto sm:order-none">
			<ThemeToggle />
		</div>
	</div>
</header>
