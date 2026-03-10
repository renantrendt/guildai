#!/usr/bin/env node
import chalk from 'chalk'
import ora from 'ora'
import * as readline from 'readline'
import { buildGraph, hasCircularDependency } from './dependency.js'
import { generateScenarios } from './scenarios.js'
import { showSplash, showStory, showGitHubPull, animateFireWhileWaiting, showCursor } from './cinema.js'
import { renderResults, saveReport, type SimulationOutput } from './reporter.js'
import issuesData from './data/issues.json' with { type: 'json' }

const WORKER_URL = 'https://guild-pm-agent.renan-870.workers.dev'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    process.stdout.write(question)
    let input = ''

    const onData = (char: Buffer) => {
      const str = char.toString()
      if (str === '\r' || str === '\n' || str === '\r\n') {
        process.stdin.removeListener('data', onData)
        process.stdin.setRawMode(false)
        process.stdin.pause()
        rl.close()
        process.stdout.write('\n')
        resolve(input)
      } else if (str === '\x7F' || str === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1)
          process.stdout.write('\b \b')
        }
      } else if (str === '\x03') {
        process.exit(0)
      } else {
        input += str
        process.stdout.write('•')
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', onData)
  })
}

async function callWorker(accessCode: string, payload: unknown): Promise<SimulationOutput> {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessCode}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (response.status === 401) throw new Error('UNAUTHORIZED')
  if (!response.ok) throw new Error(`Worker error ${response.status}: ${await response.text()}`)
  return response.json() as Promise<SimulationOutput>
}

async function runSimulation(payload: unknown): Promise<{ result: SimulationOutput; elapsedMs: number }> {
  while (true) {
    const accessCode = await promptHidden(
      chalk.dim('  ◆ ') + chalk.white('Access code: ')
    )
    console.log()

    if (!accessCode.trim()) continue

    try {
      const out = await animateFireWhileWaiting(callWorker(accessCode.trim(), payload))
      return out
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        console.log(chalk.red('  ✗ Wrong code. Try again.'))
        console.log()
      } else {
        throw err
      }
    }
  }
}

async function main() {
  process.on('SIGINT', () => { showCursor(); process.exit(0) })

  await showSplash()
  await showStory()
  await showGitHubPull(issuesData)

  const graph = buildGraph(issuesData)

  const depSpinner = ora({ text: chalk.gray('  Analyzing dependency graph...'), color: 'yellow' }).start()
  await sleep(600)
  if (hasCircularDependency(graph)) {
    depSpinner.fail(chalk.red('  Circular dependency detected'))
    process.exit(1)
  }
  depSpinner.succeed(chalk.gray(`  No circular dependencies  ·  ${graph.edgeCount} edges validated`))
  await sleep(300)

  const scenarioSpinner = ora({ text: chalk.gray('  Generating sequencing scenarios...'), color: 'yellow' }).start()
  await sleep(800)
  const scenarios = generateScenarios(graph)
  scenarioSpinner.succeed(chalk.gray(`  ${scenarios.length} scenarios generated`))
  console.log()

  const payload = {
    scenarios: scenarios.map((s) => ({ name: s.name, sequence: s.sequence, violations: s.violations })),
    issues: issuesData,
  }

  let result: SimulationOutput
  let elapsedMs: number

  try {
    const out = await runSimulation(payload)
    result = out.result
    elapsedMs = out.elapsedMs
  } catch (err) {
    console.log(chalk.red('  Simulation failed: ' + (err instanceof Error ? err.message : String(err))))
    process.exit(1)
  }

  console.log(chalk.green('  ✓ ') + chalk.gray('Simulation complete') + chalk.dim(`  ·  ${(elapsedMs / 1000).toFixed(1)}s`))

  await renderResults(result)

  const timestamp = new Date().toISOString().slice(0, 19)
  const reportPath = saveReport(result, timestamp)
  console.log(chalk.dim(`  Report saved → ${reportPath}`))
  console.log()

  await sleep(800)
  console.log(chalk.dim('  ──────────────────────────────────────────────────────────'))
  console.log()

  const closing = [
    { text: 'This agent just simulated your roadmap.', thesis: false },
    { text: 'But it ran on probability.',             thesis: false },
    { text: '',                                       thesis: false },
    { text: 'They need hard boundaries.',             thesis: true  },
    { text: 'They need enforcement outside the model.', thesis: true },
    { text: 'They need a control plane.',             thesis: true  },
  ]

  for (const { text, thesis } of closing) {
    if (text === '') { console.log(); continue }
    const color = thesis ? chalk.hex('#FF8C00').bold : chalk.dim
    process.stdout.write('  ')
    for (const char of text) {
      process.stdout.write(color(char))
      await sleep(thesis ? 22 : 18)
    }
    process.stdout.write('\n')
    await sleep(thesis ? 300 : 80)
  }

  console.log()
  await sleep(400)
  console.log(chalk.dim('                                    — guild.ai'))
  console.log()
}

main().catch((err) => {
  showCursor()
  console.error(chalk.red('\n  Error: ' + (err instanceof Error ? err.message : String(err))))
  process.exit(1)
})
