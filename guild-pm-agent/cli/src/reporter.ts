import chalk from 'chalk'
import Table from 'cli-table3'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function streamLine(text: string, delayMs = 18): Promise<void> {
  for (const char of text) { process.stdout.write(char); await sleep(delayMs) }
  process.stdout.write('\n')
}

async function revealLine(text: string, pauseAfter = 60): Promise<void> {
  console.log(text); await sleep(pauseAfter)
}

type ChalkFn = (s: string) => string

function riskColor(score: number): ChalkFn {
  if (score <= 3) return chalk.green
  if (score <= 6) return chalk.yellow
  return chalk.red
}

function riskLabel(score: number): string {
  if (score <= 3) return 'LOW'
  if (score <= 6) return 'MEDIUM'
  return 'HIGH'
}

function bar(count: number, max = 5, _char = '█', color: (s: string) => string = chalk.hex('#FF6B00')): string {
  const filled = Math.min(Math.round((count / max) * 8), 8)
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(8 - filled))
}

export interface ScenarioResult {
  name: string
  sequence: string[]
  timeline_weeks: number
  enterprise_impact: { deals_at_risk: string[]; deals_unlocked: string[] }
  revenue_unlock: { Q2: string[]; Q3: string[]; Q4: string[] }
  risk_events: string[]
  team_bottlenecks: string[]
  risk_score: number
  summary: string
}

export interface SimulationOutput {
  scenarios: ScenarioResult[]
  recommendation: { winner: string; reasoning: string; key_insight: string }
}

export async function renderResults(output: SimulationOutput): Promise<void> {
  const { scenarios, recommendation } = output

  await sleep(300)
  console.log()
  await revealLine(chalk.dim('  ══════════════════════════════════════════════════════════'), 80)
  await revealLine(chalk.hex('#FF6B00').bold('  SIMULATION RESULTS') + chalk.dim('  ·  Guild PM Agent'), 80)
  await revealLine(chalk.dim('  ══════════════════════════════════════════════════════════'), 200)
  console.log()

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    const dealsAtRisk: string[] = Array.isArray(scenario.enterprise_impact?.deals_at_risk) ? scenario.enterprise_impact.deals_at_risk : []
    const dealsUnlocked: string[] = Array.isArray(scenario.enterprise_impact?.deals_unlocked) ? scenario.enterprise_impact.deals_unlocked : []
    const riskEvents: string[] = Array.isArray(scenario.risk_events) ? scenario.risk_events : []
    const bottlenecks: string[] = Array.isArray(scenario.team_bottlenecks) ? scenario.team_bottlenecks : []
    const riskScore: number = typeof scenario.risk_score === 'number' ? scenario.risk_score : 5
    const timelineWeeks: number = typeof scenario.timeline_weeks === 'number' ? scenario.timeline_weeks : 0
    const summary: string = scenario.summary ?? ''

    const isWinner = scenario.name === recommendation.winner
    const prefix = isWinner ? chalk.hex('#FFD700')('  ★ ') : chalk.dim('  ◆ ')
    const titleColor = isWinner ? chalk.hex('#FFD700').bold : chalk.white.bold
    const riskC = riskColor(riskScore)

    await revealLine(prefix + titleColor(scenario.name), 60)
    await revealLine(chalk.dim(`    Duration: ${timelineWeeks}w  ·  Risk: `) + riskC(`${riskLabel(riskScore)} (${riskScore}/10)`), 120)
    console.log()

    for (const deal of dealsAtRisk) await revealLine(chalk.red('    ✗ ') + chalk.gray(deal), 80)
    for (const deal of dealsUnlocked) await revealLine(chalk.green('    ✓ ') + chalk.gray(deal), 80)
    for (const risk of riskEvents) await revealLine(chalk.yellow('    ⚠ ') + chalk.dim(risk), 80)
    for (const b of bottlenecks) await revealLine(chalk.dim('    · ') + chalk.dim(b), 80)

    console.log()
    const summaryWords = summary.match(/.{1,70}(\s|$)/g) ?? [summary]
    for (const chunk of summaryWords) await streamLine(chalk.dim('    ') + chalk.gray(chunk.trim()), 12)
    console.log()
    await revealLine(chalk.dim('  ──────────────────────────────────────────────────────────'), 300)
    console.log()
    if (i < scenarios.length - 1) await sleep(400)
  }

  await revealLine(chalk.white.bold('  COMPARISON'), 120)
  console.log()

  const table = new Table({
    head: [chalk.dim(''), ...scenarios.map((s) => s.name === recommendation.winner ? chalk.hex('#FFD700').bold(s.name) : chalk.white(s.name))],
    style: { head: [], border: ['dim'] },
    chars: { top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘', left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
  })

  const safeLen = (v: unknown): number => Array.isArray(v) ? v.length : 0
  const safeNum = (v: unknown, fallback = 0): number => typeof v === 'number' ? v : fallback

  table.push(
    [chalk.dim('Duration'), ...scenarios.map((s) => chalk.cyan(`${safeNum(s.timeline_weeks)}w`))],
    [chalk.dim('Enterprise $'), ...scenarios.map((s) => bar(safeLen(s.enterprise_impact?.deals_unlocked), 4))],
    [chalk.dim('Deals at risk'), ...scenarios.map((s) => { const n = safeLen(s.enterprise_impact?.deals_at_risk); return n === 0 ? chalk.green('none') : chalk.red(`${n} deal${n > 1 ? 's' : ''}`) })],
    [chalk.dim('Risk'), ...scenarios.map((s) => riskColor(safeNum(s.risk_score, 5))(riskLabel(safeNum(s.risk_score, 5))))],
    [chalk.dim('Q2 unlocks'), ...scenarios.map((s) => chalk.white(safeLen(s.revenue_unlock?.Q2).toString()))],
    [chalk.dim('Q3 unlocks'), ...scenarios.map((s) => chalk.white(safeLen(s.revenue_unlock?.Q3).toString()))],
    [chalk.dim('Q4 unlocks'), ...scenarios.map((s) => chalk.white(safeLen(s.revenue_unlock?.Q4).toString()))],
  )

  for (const line of table.toString().split('\n')) await revealLine('  ' + line, 80)
  console.log()
  await revealLine(chalk.dim('  ══════════════════════════════════════════════════════════'), 300)
  console.log()

  await sleep(400)
  await streamLine(chalk.hex('#FFD700').bold(`  ★ RECOMMENDATION: ${recommendation.winner}`), 14)
  await revealLine(chalk.dim('  ──────────────────────────────────────────────────────────'), 120)
  console.log()

  const reasoningChunks = recommendation.reasoning.match(/.{1,72}(\s|$)/g) ?? [recommendation.reasoning]
  for (const chunk of reasoningChunks) { await streamLine(chalk.gray('  ' + chunk.trim()), 14); await sleep(30) }
  console.log()
  await sleep(200)
  await streamLine(chalk.hex('#FF8C00')('  Key insight: ') + chalk.white(recommendation.key_insight), 14)
  console.log()
  await revealLine(chalk.dim('  ══════════════════════════════════════════════════════════'), 0)
  console.log()
}

export function saveReport(output: SimulationOutput, timestamp: string): string {
  const { scenarios, recommendation } = output
  const lines: string[] = ['# Guild PM Agent — Roadmap Simulation Report', `Generated: ${timestamp}`, '', '---', '', '## Scenarios', '']
  for (const s of scenarios) {
    const isWinner = s.name === recommendation.winner
    lines.push(`### ${isWinner ? '★ ' : ''}${s.name}`)
    lines.push(`- **Duration:** ${s.timeline_weeks} weeks`, `- **Risk:** ${riskLabel(s.risk_score ?? 5)} (${s.risk_score}/10)`, `- **Sequence:** ${s.sequence?.join(' → ') ?? ''}`, '', `**Summary:** ${s.summary ?? ''}`, '')
    const atRisk = s.enterprise_impact?.deals_at_risk ?? []
    const unlocked = s.enterprise_impact?.deals_unlocked ?? []
    const risks = s.risk_events ?? []
    if (atRisk.length > 0) { lines.push('**Deals at risk:**'); for (const d of atRisk) lines.push(`- ✗ ${d}`); lines.push('') }
    if (unlocked.length > 0) { lines.push('**Deals unlocked:**'); for (const d of unlocked) lines.push(`- ✓ ${d}`); lines.push('') }
    if (risks.length > 0) { lines.push('**Risk events:**'); for (const r of risks) lines.push(`- ⚠ ${r}`); lines.push('') }
    lines.push('---', '')
  }
  lines.push('## ★ Recommendation', '', `**Winner: ${recommendation.winner}**`, '', recommendation.reasoning, '', `**Key insight:** ${recommendation.key_insight}`)
  const reportsDir = join(process.cwd(), 'reports')
  mkdirSync(reportsDir, { recursive: true })
  const filename = join(reportsDir, `${timestamp.replace(/[:.]/g, '-')}.md`)
  writeFileSync(filename, lines.join('\n'), 'utf8')
  return filename
}
