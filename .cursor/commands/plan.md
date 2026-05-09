# Plan process (implementation planning)

## Setup

Decide on a name for the plan. This should be a short, descriptive name that
captures the purpose of the plan. This will be referred to as `<plan-name>` in this
document.

Create a new plan directory at `docs/plans/<YYYY-MM-dd>-<plan-name>/`.

Use `date +%Y-%m-%d` to get the current date.

This directory will contain the plan files for the plan.

**Note:** Run pnpm and Turbo commands from the skills-verifier repository root
unless a phase file specifies a different working directory.

## Analysis

Analyze the current scope of work, and populate a `00-notes.md` file with the
following sections:

- The scope of work
- The current state of the codebase as it pertains to the scope of work
- Questions that need to be answered to complete the plan. Each question should
  include context and a suggested answer.

## Question Iteration

Ask the user each question, ONE AT A TIME:

include in the question:

- the question
- the current state of the codebase as it pertains to the question
- your suggested course forward

The user will answer the question or ask follow up questions.

Once the question is answered or otherwise resolved:

- You will record the answers in the `00-notes.md` file.
- If the user's answers imply additional questions, add them to the file.
- If the user's answers include other notes, add them to the file in a `# Notes` section.
- If the user's answers affect other questions or the scope of work, update the file
  accordingly before moving on.
- Move on to the next question.

## Code style (before design)

**Before** the design iteration (and again when writing phase files), read the
style guide so the plan matches team conventions:

1. Read [`docs/style/README.md`](../../docs/style/README.md) (golden rules and index).
2. Open any topic files that apply to this plan — for example
   [`factory-functions.md`](../../docs/style/factory-functions.md),
   [`providers.md`](../../docs/style/providers.md),
   [`schemas.md`](../../docs/style/schemas.md),
   [`naming.md`](../../docs/style/naming.md),
   [`file-organization.md`](../../docs/style/file-organization.md),
   [`documentation.md`](../../docs/style/documentation.md).
3. Skim [`AGENTS.md`](../../AGENTS.md) for the short pattern checklist.

You will **copy** the conventions that matter for this work into the plan
artifacts (below) so implementation does not rely on memory alone. Prefer
verbatim bullets or tight paraphrases of the style guide — enough detail to choose
factories vs classes, naming, file layout, and schema patterns without re-reading
every doc during each phase.

### In `00-notes.md`

Add a section **## Style conventions (for this plan)** when the scope touches
code structure, APIs, or UI. List only what applies (e.g. "ZodFactory for new
DTOs", "domain folder under `src/lib/server/domain/`"). If the plan is docs-only,
note that or omit the section.

### In `00-design.md`

Include **## Style conventions** after the architecture summary. This section
must mirror the relevant points from `docs/style/` and `AGENTS.md` for this
feature (factory functions, providers, ZodFactory, domain-first layout, file size,
naming, import order, documentation expectations — as applicable). The goal is a
single place the agent re-reads while implementing.

## Design Iteration

Once questions are answered, you will present me with a suggestion of an
architecture design with two main elements:

The file structure as a bare-bones ascii file tree of the relevant directories
and files.
Do NOT create a file to show the file tree, print it to the user in a code
block, like this:

```
module/
└── src/
    ├── file.ts                 # NEW: File with things in it
    └── updater.ts              # UPDATE: File with the updater function
```

A summary of the conceptual architecture. This could be ASCII art, a diagram,
or a class hierarchy. It should summarize the main components and how they
interact in an easy
to understand way.

If I want to make changes, I will tell you and you will show me relevant updates
to the file tree
and architecture summary.

## Design Completion

Once the design is agreed, you will create a new file called `00-design.md` with
the design overview.

The design file should include:

- Scope of work
- File structure (as shown above)
- Conceptual architecture summary
- Main components and how they interact
- **Style conventions** (required) — bullets drawn from `docs/style/` and
  `AGENTS.md` for this plan; see [Code style (before design)](#code-style-before-design)

# Plan phases

Consider how best to break down the work into phases.

Present phase suggestions to me, like this example:

```
1. Extend ElfLoadInfo
2. Create Object Submodule Structure
3. Implement Object Layout Calculation
4. Implement Object Section Loading
5. Implement Object Symbol Map Building
6. Implement Symbol Map Merging
7. Cleanup, review, and validation
```

I will then make suggestions to change the phases, or add more phases.

Once I tell you that we're ready to start, save the phases to the plan
directory.

# Phase Files

The names of the phase files should be like: `01-phase-title.md`,
`02-phase-title.md`, etc.

Every phase file should include:

## Scope of phase

A short summary of the scope of work for the phase.

## Code Organization Reminders

Every phase should include some code quality reminders.

- Prefer a granular file structure, one concept per file.
- Place more abstract things, entry points, and tests **first**
- Place helper utility functions **at the bottom** of files.
- Keep related functionality grouped together
- Any temporary code should have a TODO comment so we can find it later.

## Style conventions

Repeat the **subset** of `docs/style/` / `AGENTS.md` rules that applies to **this
phase** (copy or tighten bullets from `00-design.md` — factories vs classes,
ZodFactory, `provide*` / providers, domain-first paths, naming, ~200-line files,
import order, TSDoc for new public APIs, etc.). If this phase is documentation or
tooling-only, say so explicitly. The agent should not need to re-open the full
style guide for routine decisions while executing the phase.

## Implementation Details

Be specific and detailed. Write out code examples where appropriate.
Include tests to write to verify the work in the phase.

## Validate

Specify exactly which commands should be run to validate the phase. Generally,
this will be `pnpm turbo check` and `pnpm turbo test`, or `pnpm turbo validate`
for checks, tests, and build (see README and `turbo.jsonc`).

We want to keep the code compiling and passing tests as we go.

Clean up any warnings that won't be fixed in later phases (like unused
functions)

DO NOT COMMIT between phases unless specifically requested. Keeping plans in one
commit makes
it easier to review changes and produces a better git log.

# Final Phase

The final phase of all plans should be a cleanup phase:

## Cleanup & validation

Grep the git diff for any temporary code, TODOs, debug prints, etc. Remove them.

Specify the exact validation commands to run (typically `pnpm turbo check` and
`pnpm turbo test`, or `pnpm turbo validate`; see README).

Fix all warnings, errors, and formatting issues.

## Plan cleanup

Add a summary of the completed work to `<plan-dir>/summary.md`.

Move the plan files to the `docs/plans-done/` directory.

## Commit

Once the plan is complete, and everything compiles and passes tests, it's time
to commit the changes. STOP FOR HUMAN REVIEW before committing with a proposed
commit message. The message should follow the
[Conventional Commits](https://www.conventionalcommits.org/) format

```
<type>(<scope>): <description>

<body>
```

Where:

- <type> is the type of commit (e.g. feat, fix, chore, docs, etc.)
- <scope> is the scope of the commit (e.g. ui, backend, docs, etc.)
- <description> is a short description of the commit

<body> should be included only if the changes are not obvious from the description.

It should be a bulleted list of the changes made. Each item should be a single
line.
Be clear, concise, and to the point.

After human approval, commit the changes.
