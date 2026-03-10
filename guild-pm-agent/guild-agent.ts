"use agent"

/**
 * guild-agent.ts
 *
 * This is the native Guild.ai Agent Hub version of Guild PM Agent.
 * It would be published via: guild agent save --message "v1.0" --wait --publish
 *
 * The standalone CLI (cli/) is the runnable version while awaiting Guild access.
 * This stub shows the exact format this agent takes on the platform.
 */

import {
  agent,
  userInterfaceTools,
  progressLogNotifyEvent,
  type Task,
} from "@guildai/agents-sdk"
import { z } from "zod"

// ─── Schemas ────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  focus: z
    .enum(["enterprise", "growth", "balanced"])
    .optional()
    .describe("Strategic focus for scenario weighting. Defaults to balanced."),
})

const violationSchema = z.object({
  blocked: z.string(),
  requires: z.string(),
  blockedTitle: z.string(),
  requiresTitle: z.string(),
})

const scenarioResultSchema = z.object({
  name: z.string(),
  sequence: z.array(z.string()),
  timeline_weeks: z.number(),
  enterprise_impact: z.object({
    deals_at_risk: z.array(z.string()),
    deals_unlocked: z.array(z.string()),
  }),
  revenue_unlock: z.object({
    Q2: z.array(z.string()),
    Q3: z.array(z.string()),
    Q4: z.array(z.string()),
  }),
  risk_events: z.array(z.string()),
  team_bottlenecks: z.array(z.string()),
  risk_score: z.number().min(0).max(10),
  summary: z.string(),
})

const outputSchema = z.object({
  scenarios: z.array(scenarioResultSchema),
  recommendation: z.object({
    winner: z.string(),
    reasoning: z.string(),
    key_insight: z.string(),
  }),
  violations_detected: z.array(violationSchema),
  total_issues_analyzed: z.number(),
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>
type Tools = typeof tools

// ─── Tools ──────────────────────────────────────────────────────────────────

const tools = {
  ...userInterfaceTools,
}

// ─── Core logic (mirrors cli/src/dependency.ts + cli/src/scenarios.ts) ──────

interface Issue {
  id: string
  title: string
  depends_on: string[]
  effort_weeks: number
  team: string
  blocks_deals: string[]
  unlocks_segment: string
  revenue_unlock_quarter: string
}

function buildIssueMap(issues: Issue[]): Map<string, Issue> {
  return new Map(issues.map((i) => [i.id, i]))
}

function validateSequence(sequence: string[], issueMap: Map<string, Issue>) {
  const shipped = new Set<string>()
  const violations = []

  for (const id of sequence) {
    const issue = issueMap.get(id)
    if (!issue) continue
    for (const dep of issue.depends_on) {
      if (!shipped.has(dep)) {
        const depIssue = issueMap.get(dep)
        violations.push({
          blocked: id,
          requires: dep,
          blockedTitle: issue.title,
          requiresTitle: depIssue?.title ?? dep,
        })
      }
    }
    shipped.add(id)
  }

  return violations
}

// ─── Run function ────────────────────────────────────────────────────────────

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  // In the native Guild version, issues would be fetched via guildTools
  // or gitHubTools from the connected workspace repository.
  // For the standalone demo, issues are bundled in cli/src/data/issues.json.
  //
  // Example native fetch (when GitHub integration is connected):
  //   const ghIssues = await task.tools.github_issues_list({ owner: "guildai", repo: "platform" })

  await task.ui?.notify(progressLogNotifyEvent("Loading backlog from GitHub..."))

  // Simulate loading issues (in production: fetch from GitHub)
  const issues: Issue[] = [] // populated from gitHubTools in production

  await task.ui?.notify(progressLogNotifyEvent("Building dependency graph..."))

  const issueMap = buildIssueMap(issues)

  await task.ui?.notify(progressLogNotifyEvent("Generating sequencing scenarios..."))

  // Generate scenario archetypes (same logic as cli/src/scenarios.ts)
  const enterpriseFirst = issues
    .slice()
    .sort((a, b) => b.blocks_deals.length - a.blocks_deals.length)
    .map((i) => i.id)

  const scenarios = [
    { name: "Enterprise First", sequence: enterpriseFirst },
    // ... additional archetypes
  ]

  const allViolations = scenarios.flatMap((s) => validateSequence(s.sequence, issueMap))

  await task.ui?.notify(progressLogNotifyEvent("Running consequence simulation..."))

  // Call LLM only for narrative reasoning — deterministic work is done above
  const narrativeResult = await task.llm.generateText({
    prompt: `You are a senior product strategy advisor for Guild.ai (Series A, enterprise GTM).
Analyze these roadmap sequencing scenarios and return business consequences.
Issues: ${JSON.stringify(issues)}
Scenarios: ${JSON.stringify(scenarios)}
Return structured analysis per scenario with named deal impacts, quarterly revenue unlocks, risk events, and a final recommendation.`,
  })

  // In production: parse narrativeResult.text into ScenarioResult[]
  // Here we return a typed placeholder — the real output comes from tool_use in the worker
  return {
    scenarios: [],
    recommendation: {
      winner: "",
      reasoning: narrativeResult.text,
      key_insight: "",
    },
    violations_detected: allViolations,
    total_issues_analyzed: issues.length,
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default agent({
  description:
    "Autonomous PM agent that loads your GitHub backlog, generates strategic sequencing scenarios, simulates business consequences for each (enterprise deals, revenue timing, risk), and recommends the optimal sequence.",
  inputSchema,
  outputSchema,
  tools,
  run,
})
