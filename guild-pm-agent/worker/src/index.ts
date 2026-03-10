export interface Env {
  ANTHROPIC_API_KEY: string
  ACCESS_CODE: string
}

interface Issue {
  id: string
  title: string
  type: string
  priority: string
  depends_on: string[]
  effort_weeks: number
  team: string
  blocks_deals: string[]
  unlocks_segment: string
  revenue_unlock_quarter: string
  github_issue_number: number
  description: string
}

interface ScenarioInput {
  name: string
  sequence: string[]
  violations: Array<{ blocked: string; requires: string }>
}

interface SimulationRequest {
  scenarios: ScenarioInput[]
  issues: Issue[]
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const auth = request.headers.get('Authorization') ?? ''
    const token = auth.replace('Bearer ', '').trim()

    if (!token || token !== env.ACCESS_CODE) {
      return new Response('Unauthorized', { status: 401 })
    }

    let body: SimulationRequest
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const { scenarios, issues } = body

    if (!scenarios?.length || !issues?.length) {
      return new Response('Missing scenarios or issues', { status: 400 })
    }

    try {
      const result = await runSimulationParallel(env.ANTHROPIC_API_KEY, scenarios, issues)
      return Response.json(result, { headers: CORS_HEADERS })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation failed'
      return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS })
    }

  },
}

async function runSimulationParallel(apiKey: string, scenarios: ScenarioInput[], issues: Issue[]): Promise<unknown> {
  const issueMap = Object.fromEntries(issues.map((i) => [i.id, i]))

  // Run one Anthropic call per scenario in parallel — cuts wait time by ~4x
  const scenarioResults = await Promise.all(
    scenarios.map((scenario) => simulateSingleScenario(apiKey, scenario, issues, issueMap))
  )

  // Final lightweight call for the cross-scenario recommendation
  const recommendation = await getRecommendation(apiKey, scenarioResults, issues)

  return { scenarios: scenarioResults, recommendation }
}

async function simulateSingleScenario(
  apiKey: string,
  scenario: ScenarioInput,
  issues: Issue[],
  issueMap: Record<string, Issue>
): Promise<unknown> {
  const seqTitles = scenario.sequence.map((id) => `${id}(${issueMap[id]?.title ?? '?'})`).join(' → ')
  const totalWeeks = scenario.sequence.reduce((sum, id) => sum + (issueMap[id]?.effort_weeks ?? 0), 0)
  const violationText = scenario.violations.length > 0
    ? `Violations: ${scenario.violations.map((v) => `${v.blocked} ships before required ${v.requires}`).join('; ')}`
    : 'No dependency violations'

  const prompt = `You are a senior product strategy advisor for Guild.ai — a Series A startup building a neutral control plane for AI agents. Enterprise-led GTM, Agent Hub is the growth flywheel.

BACKLOG CONTEXT:
${issues.map((i) => `${i.id} | "${i.title}" | Team: ${i.team} | ${i.effort_weeks}w | Blocks: ${i.blocks_deals.join(', ') || 'none'} | Revenue: ${i.revenue_unlock_quarter}`).join('\n')}

SCENARIO: ${scenario.name}
Sequence: ${seqTitles}
Total effort: ~${totalWeeks} weeks
${violationText}

Simulate the real business consequences of this exact sequencing. Be specific: name the deals, name the quarters, name the risks. Return structured analysis.`

  const response = await callAnthropic(apiKey, prompt, singleScenarioTool(scenario.name))
  const data = response as { content: Array<{ type: string; input?: unknown }> }
  const toolUse = data.content?.find((c: {type: string}) => c.type === 'tool_use') as { input?: unknown } | undefined
  if (!toolUse?.input) throw new Error(`No output for scenario ${scenario.name}`)
  return toolUse.input
}

async function getRecommendation(apiKey: string, scenarioResults: unknown[], issues: Issue[]): Promise<unknown> {
  const prompt = `You are a senior product strategy advisor for Guild.ai (Series A, enterprise-led GTM).

Here are the simulation results for 4 roadmap sequencing scenarios:
${JSON.stringify(scenarioResults, null, 2)}

Based on Guild.ai's current stage — enterprise pipeline, Agent Hub as growth flywheel, SOC2 as a blocker for 3 active deals — which scenario should they ship and why? Be direct and specific.`

  const response = await callAnthropic(apiKey, prompt, recommendationTool())
  const data = response as { content: Array<{ type: string; input?: unknown }> }
  const toolUse = data.content?.find((c: {type: string}) => c.type === 'tool_use') as { input?: unknown } | undefined
  if (!toolUse?.input) throw new Error('No recommendation output')
  return toolUse.input
}

function singleScenarioTool(scenarioName: string) {
  return {
    name: 'scenario_result',
    description: `Structured business consequence analysis for the "${scenarioName}" scenario`,
    input_schema: {
      type: 'object',
      required: ['name', 'sequence', 'timeline_weeks', 'enterprise_impact', 'revenue_unlock', 'risk_events', 'team_bottlenecks', 'risk_score', 'summary'],
      properties: {
        name: { type: 'string' },
        sequence: { type: 'array', items: { type: 'string' } },
        timeline_weeks: { type: 'number' },
        enterprise_impact: {
          type: 'object',
          required: ['deals_at_risk', 'deals_unlocked'],
          properties: {
            deals_at_risk: { type: 'array', items: { type: 'string' } },
            deals_unlocked: { type: 'array', items: { type: 'string' } },
          },
        },
        revenue_unlock: {
          type: 'object',
          required: ['Q2', 'Q3', 'Q4'],
          properties: {
            Q2: { type: 'array', items: { type: 'string' } },
            Q3: { type: 'array', items: { type: 'string' } },
            Q4: { type: 'array', items: { type: 'string' } },
          },
        },
        risk_events: { type: 'array', items: { type: 'string' } },
        team_bottlenecks: { type: 'array', items: { type: 'string' } },
        risk_score: { type: 'number', minimum: 0, maximum: 10 },
        summary: { type: 'string' },
      },
    },
  }
}

function recommendationTool() {
  return {
    name: 'recommendation',
    description: 'Cross-scenario recommendation for the best sequencing approach',
    input_schema: {
      type: 'object',
      required: ['winner', 'reasoning', 'key_insight'],
      properties: {
        winner: { type: 'string' },
        reasoning: { type: 'string' },
        key_insight: { type: 'string' },
      },
    },
  }
}

async function callAnthropic(apiKey: string, prompt: string, tool: object): Promise<unknown> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: (tool as {name: string}).name },
      tools: [tool],
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${text}`)
  }

  return response.json()
}

function buildPrompt(scenarios: ScenarioInput[], issues: Issue[]): string {
  const issueMap = Object.fromEntries(issues.map((i) => [i.id, i]))

  const issueList = issues
    .map(
      (i) =>
        `  ${i.id} | "${i.title}" | Team: ${i.team} | ${i.effort_weeks}w | ` +
        `Blocks: ${i.blocks_deals.join(', ') || 'none'} | Revenue unlock: ${i.revenue_unlock_quarter} | Segment: ${i.unlocks_segment}`
    )
    .join('\n')

  const scenarioList = scenarios
    .map((s) => {
      const seq = s.sequence.map((id) => `${id}(${issueMap[id]?.title ?? '?'})`).join(' → ')
      const totalWeeks = s.sequence.reduce((sum, id) => sum + (issueMap[id]?.effort_weeks ?? 0), 0)
      const violationText =
        s.violations.length > 0
          ? `  ⚠ Violations: ${s.violations.map((v) => `${v.blocked} ships before required ${v.requires}`).join('; ')}`
          : '  ✓ All dependencies satisfied'
      return `### ${s.name}\n  Sequence: ${seq}\n  Total effort: ~${totalWeeks} weeks\n${violationText}`
    })
    .join('\n\n')

  return `You are a senior product strategy advisor for Guild.ai — a Series A startup building a neutral control plane for AI agents ("GitHub for AI agents"). They are in an enterprise-led GTM motion with Agent Hub as the growth flywheel.

BACKLOG (${issues.length} GitHub issues):
${issueList}

SEQUENCING SCENARIOS TO ANALYZE:
${scenarioList}

For EACH scenario, simulate real business consequences with specificity:
- Which named enterprise deals close, stall, or are lost — and when
- Revenue unlock by quarter (Q2/Q3/Q4)
- Risk events that could materialize (outages, rollback issues, team overload)
- Team bottlenecks (who is on the critical path for how long)
- An honest risk score 0–10

Then give a single recommendation: the best scenario for Guild.ai's current stage, with sharp reasoning grounded in their GTM reality.`
}

async function runSimulation(apiKey: string, scenarios: ScenarioInput[], issues: Issue[]): Promise<unknown> {
  const prompt = buildPrompt(scenarios, issues)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      tool_choice: { type: 'tool', name: 'simulate_roadmap' },
      tools: [
        {
          name: 'simulate_roadmap',
          description: 'Return structured simulation results for all roadmap sequencing scenarios',
          input_schema: {
            type: 'object',
            required: ['scenarios', 'recommendation'],
            properties: {
              scenarios: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'name',
                    'sequence',
                    'timeline_weeks',
                    'enterprise_impact',
                    'revenue_unlock',
                    'risk_events',
                    'team_bottlenecks',
                    'risk_score',
                    'summary',
                  ],
                  properties: {
                    name: { type: 'string' },
                    sequence: { type: 'array', items: { type: 'string' } },
                    timeline_weeks: { type: 'number' },
                    enterprise_impact: {
                      type: 'object',
                      required: ['deals_at_risk', 'deals_unlocked'],
                      properties: {
                        deals_at_risk: { type: 'array', items: { type: 'string' } },
                        deals_unlocked: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    revenue_unlock: {
                      type: 'object',
                      required: ['Q2', 'Q3', 'Q4'],
                      properties: {
                        Q2: { type: 'array', items: { type: 'string' } },
                        Q3: { type: 'array', items: { type: 'string' } },
                        Q4: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    risk_events: { type: 'array', items: { type: 'string' } },
                    team_bottlenecks: { type: 'array', items: { type: 'string' } },
                    risk_score: { type: 'number', minimum: 0, maximum: 10 },
                    summary: { type: 'string' },
                  },
                },
              },
              recommendation: {
                type: 'object',
                required: ['winner', 'reasoning', 'key_insight'],
                properties: {
                  winner: { type: 'string' },
                  reasoning: { type: 'string' },
                  key_insight: { type: 'string' },
                },
              },
            },
          },
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as { content: Array<{ type: string; input?: unknown }> }
  const toolUse = data.content?.find((c) => c.type === 'tool_use')

  if (!toolUse?.input) {
    throw new Error('No structured output returned from model')
  }

  return toolUse.input
}
