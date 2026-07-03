<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">About the LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		The LER Interoperability Test Suite is an always-available, self-help kit for teams building
		Learning &amp; Employment Record systems — wallets, verifiers, and issuers working with Open
		Badges 3.0 and related standards. Pick the roles and profiles you care about, run the
		checklists, and get an honest read on whether your implementation actually interoperates with
		the rest of the ecosystem — not just whether it follows a specification on paper.
	</p>
</section>

<section class="mt-12 space-y-4">
	<h2 class="text-headline-md">Standards compliance is not interoperability</h2>
	<p class="max-w-prose text-body-md text-foreground">
		“We implement Open Badges 3.0” can be completely true and still not be enough. It is easy to be
		misled by vendor claims that are accurate but incomplete.
	</p>
	<ul class="max-w-prose space-y-2 text-body-md text-muted-foreground">
		<li><span class="text-foreground">Compliance</span> means you follow the specification.</li>
		<li>
			<span class="text-foreground">Interoperability</span> means you can actually exchange a credential
			with another party’s implementation of that same specification.
		</li>
	</ul>
	<p class="max-w-prose text-body-md text-muted-foreground">
		A standard leaves room for choices — exchange protocol, proof cryptosuite, status handling,
		schema extensions. Two platforms can each make valid, compliant choices and still be unable to
		talk to each other.
	</p>
</section>

<section class="mt-12 space-y-4">
	<h2 class="text-headline-md">Two compliant platforms that still fail to interoperate</h2>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2 rounded-lg border border-border bg-card p-5">
			<p class="text-label-md text-muted-foreground uppercase">Exchange protocol mismatch</p>
			<h3 class="text-title-lg text-foreground">Same credential, different pipe</h3>
			<p class="text-body-md text-muted-foreground">
				Platform A issues an OB 3.0 credential using the <strong>VCALM</strong> exchange protocol.
				Platform B only accepts credentials over <strong>OID4VCI</strong>. Both are “OB 3.0
				compliant,” yet the user can't get a credential into their wallet, because the exchange
				protocol differs.
			</p>
		</div>
		<div class="space-y-2 rounded-lg border border-border bg-card p-5">
			<p class="text-label-md text-muted-foreground uppercase">Cryptosuite mismatch</p>
			<h3 class="text-title-lg text-foreground">Same credential schema, different proof</h3>
			<p class="text-body-md text-muted-foreground">
				Verifier A only validates <strong>ECDSA</strong> Data Integrity proofs. Issuer B signs with
				<strong>EdDSA</strong>. Both conform to the Data Integrity standard, but verification still
				fails on the cryptosuite mismatch.
			</p>
		</div>
	</div>
	<p class="text-body-sm max-w-prose text-muted-foreground">
		Other axes break interoperability the same way: status-list handling, and schema or extension
		expectations two implementations don’t share.
	</p>
</section>

<section class="mt-12 space-y-4">
	<h2 class="text-headline-md">How this tool helps</h2>
	<p class="max-w-prose text-body-md text-foreground">
		The <a href={resolve('/profiles')} class="text-primary hover:underline"
			>interoperability profiles</a
		> in this suite exist precisely because “OB 3.0 compliant” is not enough. Each profile pins down the
		exact choices that make or break interoperability — credential format, exchange protocol, and proof
		cryptosuite — so that “interoperable” means something concrete.
	</p>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Pick the profiles you must interoperate with, run their checklists, and prove real
		interoperability instead of spec conformance on paper.
	</p>
	<p class="max-w-prose text-body-md">
		<a href={resolve('/')} class="text-primary hover:underline">← Back to the console</a>
	</p>
</section>
