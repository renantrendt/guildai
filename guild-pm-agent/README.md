# Guild PM Agent

> A Guild.ai PM Agent that simulates the downstream consequences of roadmap sequencing decisions — built as part of the Guild application.

![Guild PM Agent preview](https://raw.githubusercontent.com/renantrendt/guild-pm-agent/main/guild-pm-agent/preview.png)

---

## For James

```bash
npx guildaipmagent
```

Enter the access code when prompted. That's the only setup required.

The agent loads Guild.ai's GitHub backlog, generates 4 strategic sequencing scenarios, simulates the business consequences of each — which enterprise deals close or stall, when revenue unlocks, what risks emerge — and delivers a ranked recommendation.

---

## What it does

1. **Cinematic intro** — sets the scene: you're the PM, 13 minutes to all-hands, three deals hanging
2. **GitHub issue pull** — streams 15 open issues from `guildai/platform` as if fetched live
3. **Dependency analysis** — deterministic graph validation, no LLM, same result every run
4. **Scenario generation** — 4 strategic archetypes: Enterprise First, Hub Launch Sprint, Revenue Optimized, Risk Minimized
5. **Consequence simulation** — Claude returns structured business impact per scenario: deals at risk, revenue timing, risk events
6. **Recommendation** — winning scenario with reasoning grounded in Guild.ai's current GTM reality

---

## Architecture

Inspired by ["You Can't Run Production on Probability"](https://www.guild.ai/knowledge/you-cant-run-production-on-probability).

```
guild-pm-agent/
├── cli/                    # npm package
│   └── src/
│       ├── index.ts        # Orchestrator
│       ├── cinema.ts       # Animations and story
│       ├── dependency.ts   # Deterministic dep-graph validator
│       ├── scenarios.ts    # Strategic archetype generator
│       ├── reporter.ts     # Terminal output + markdown report
│       └── data/
│           └── issues.json # 15 mocked Guild.ai GitHub issues
├── worker/                 # Cloudflare Worker
│   └── src/index.ts        # Bearer auth → parallel Anthropic calls → structured JSON
└── guild-agent.ts          # Native Guild SDK stub
```

---

## guild-agent.ts

The `guild-agent.ts` at the repo root shows how this agent would be published natively to Guild Agent Hub using `@guildai/agents-sdk` — `AutomaticallyManagedStateAgent` with Zod input/output schemas, `task.llm.generateText()` for the narrative layer, and `userInterfaceTools` for progress notifications.

When Agent Hub is publicly available:

```bash
guild agent init --name guild-pm-agent --template AUTO_MANAGED_STATE
guild agent save --message "v1.0" --wait --publish
```

---

*Built by Renan Serrano — Application to Guild.ai.*
