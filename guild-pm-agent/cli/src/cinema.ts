import chalk from 'chalk'
import figlet from 'figlet'
import { type Issue } from './dependency.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function hideCursor(): Promise<void> { process.stdout.write('\x1B[?25l') }
export async function showCursor(): Promise<void> { process.stdout.write('\x1B[?25h') }
export async function clearLine(): Promise<void> { process.stdout.write('\r\x1B[2K') }

async function typewrite(text: string, delayMs = 38): Promise<void> {
  for (const char of text) { process.stdout.write(char); await sleep(delayMs) }
}
async function typewriteLine(text: string, delayMs = 38): Promise<void> {
  await typewrite(text, delayMs); process.stdout.write('\n')
}

export async function showSplash(): Promise<void> {
  console.clear()
  await hideCursor()
  const logo = [
    chalk.hex('#FF6B00')('   ██████╗ ██╗   ██╗██╗██╗     ██████╗ '),
    chalk.hex('#FF6B00')('  ██╔════╝ ██║   ██║██║██║     ██╔══██╗'),
    chalk.hex('#FF8C00')('  ██║  ███╗██║   ██║██║██║     ██║  ██║'),
    chalk.hex('#FF8C00')('  ██║   ██║██║   ██║██║██║     ██║  ██║'),
    chalk.hex('#FFA500')('  ╚██████╔╝╚██████╔╝██║███████╗██████╔╝'),
    chalk.hex('#FFA500')('   ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ '),
    '',
    chalk.hex('#FFD700')('   ██████╗ ███╗   ███╗     █████╗  ██████╗ ███████╗███╗   ██╗████████╗'),
    chalk.hex('#FFD700')('   ██╔══██╗████╗ ████║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝'),
    chalk.hex('#FFC107')('   ██████╔╝██╔████╔██║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   '),
    chalk.hex('#FFC107')('   ██╔═══╝ ██║╚██╔╝██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   '),
    chalk.hex('#FFEB3B')('   ██║     ██║ ╚═╝ ██║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   '),
    chalk.hex('#FFEB3B')('   ╚═╝     ╚═╝     ╚═╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   '),
  ]
  for (const line of logo) { console.log(line); await sleep(60) }
  console.log()
  console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'))
  console.log(chalk.dim('  A Guild.ai PM Agent  ·  Roadmap Consequence Simulator'))
  console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'))
  console.log(chalk.dim('                                                        v1.0.4'))
  console.log()
  await sleep(800)
}

export async function showStory(): Promise<void> {
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const lines = [
    { text: chalk.gray(`  San Francisco. ${dayName}, ${timeStr}.`), delay: 900 },
    { text: '', delay: 400 },
    { text: chalk.white('  You are the Head of Product at Guild.ai.'), delay: 700 },
    { text: '', delay: 300 },
    { text: chalk.gray('  Engineering all-hands starts in 13 minutes.'), delay: 500 },
    { text: chalk.gray('  Slack is lit up. Three enterprise prospects are'), delay: 400 },
    { text: chalk.gray('  waiting on features that depend on work that'), delay: 400 },
    { text: chalk.gray("  hasn't started."), delay: 600 },
    { text: '', delay: 300 },
    { text: chalk.yellow('  GitHub has 47 open issues.'), delay: 500 },
    { text: chalk.yellow('  Every wrong call'), delay: 400 },
    { text: chalk.yellow('  costs a deal.'), delay: 900 },
    { text: '', delay: 500 },
    { text: chalk.white('  You open Guild PM Agent.'), delay: 1200 },
    { text: '', delay: 600 },
  ]
  for (const { text, delay } of lines) { await typewriteLine(text, 28); await sleep(delay) }
  await sleep(600)
}

export async function showGitHubPull(issues: Issue[]): Promise<void> {
  console.log()
  await sleep(300)
  process.stdout.write(chalk.hex('#FF6B00')('  ◆ '))
  await typewrite(chalk.white('Connecting to Guild GitHub Extension...'), 22)
  console.log()
  await sleep(600)
  console.log(chalk.green('    ✓ ') + chalk.gray('Authenticated'))
  await sleep(300)
  console.log(chalk.green('    ✓ ') + chalk.gray('Repository: guildai/platform'))
  await sleep(500)
  console.log()
  process.stdout.write(chalk.hex('#FF6B00')('  ◆ '))
  await typewrite(chalk.white('Fetching open issues from GitHub...'), 22)
  console.log()
  await sleep(400)
  const spinFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let spinIdx = 0
  process.stdout.write(chalk.gray(`    ${spinFrames[0]} Scanning milestone: Q2 2026`))
  for (let i = 0; i < 14; i++) {
    await sleep(120); spinIdx = (spinIdx + 1) % spinFrames.length
    clearLine(); process.stdout.write(chalk.gray(`    ${spinFrames[spinIdx]} Scanning milestone: Q2 2026`))
  }
  clearLine()
  console.log(chalk.green('    ✓ ') + chalk.gray('Milestone: Q2 2026'))
  console.log()
  for (const issue of issues) {
    await sleep(95)
    const effortBar = '█'.repeat(Math.min(issue.effort_weeks, 8))
    const teamColor = issue.team === 'Security' ? chalk.red : issue.team === 'Platform' ? chalk.blue : issue.team === 'Core' ? chalk.cyan : issue.team === 'Hub' ? chalk.magenta : chalk.gray
    const id = chalk.hex('#FF8C00')(issue.id.padEnd(6))
    const title = chalk.white(issue.title.padEnd(44))
    const team = teamColor(`[${issue.team}]`.padEnd(16))
    const bar = chalk.hex('#FF6B00')(effortBar)
    console.log(`    ${chalk.dim('→')} ${id} ${title} ${team} ${bar}`)
  }
  console.log()
  await sleep(400)
  console.log(chalk.green('    ✓ ') + chalk.white(`${issues.length} issues loaded`) + chalk.dim('  ·  ') + chalk.white(`${issues.reduce((sum, i) => sum + i.depends_on.length, 0)} dependency edges mapped`))
  console.log()
  await sleep(800)
}

// ─── Fire text animation — ANSI Shadow block letters ────────────────────────

const FIRE_PALETTE = ['#FFFFFF', '#FFD700', '#FFA500', '#FF8C00', '#FF6B00', '#FF4500', '#FF2200', '#CC0000']

// Full slogan — each word cycles through as its own burning block letter
const FIRE_WORDS = ['KEEP', 'YOUR', 'FLAME', 'ALIVE', 'WHILE', 'GUILD', 'LEAVES', 'THE', 'FRICTION', 'BEHIND']

// Pre-render all words in ANSI Shadow at module load
const WORD_BLOCKS = new Map<string, string[]>(
  FIRE_WORDS.map((word) => [word, figlet.textSync(word, { font: 'ANSI Shadow' }).split('\n')])
)

// Per-column heat for fire flicker — keyed by column index
const MAX_COLS = 120
const COL_PHASES = Array.from({ length: MAX_COLS }, () => Math.random() * Math.PI * 2)
const COL_NOISE = Array.from({ length: MAX_COLS }, () => Math.random() * 1.2)

function getColHeat(col: number, frame: number): number {
  const phase = COL_PHASES[col] ?? 0
  const noise = COL_NOISE[col] ?? 0
  const wave = Math.sin(col * 0.12 + frame * 0.20 + phase) * 2.8
  const flicker = Math.sin(frame * 0.55 + col * 0.08 + phase * 1.7) * 1.4
  return Math.max(0, Math.min(7, Math.round(wave + flicker + noise + 3.0)))
}

function renderWordFrame(rows: string[], frame: number): string {
  return rows.map((row) => {
    if (row.trim() === '') return ''
    return '  ' + row.split('').map((char, col) => {
      if (char === ' ') return ' '
      return chalk.hex(FIRE_PALETTE[getColHeat(col, frame)])(char)
    }).join('')
  }).join('\n')
}

function renderStatusLine(elapsedMs: number): string {
  const spinFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const spin = spinFrames[Math.floor(elapsedMs / 90) % spinFrames.length]
  return (
    chalk.dim('  ') +
    chalk.hex('#FF8C00')(spin) +
    chalk.dim(' running simulations') +
    chalk.dim('  ·  ') +
    chalk.hex('#FFD700')((elapsedMs / 1000).toFixed(1) + 's')
  )
}

export async function animateFireWhileWaiting<T>(promise: Promise<T>): Promise<{ result: T; elapsedMs: number }> {
  await hideCursor()
  console.log()

  const startMs = Date.now()
  let done = false
  let frame = 0

  const animate = async () => {
    // ── Phase 1: stream all 10 words once, row by row ─────────────────────
    for (let i = 0; i < FIRE_WORDS.length; i++) {
      if (done) break
      const rows = WORD_BLOCKS.get(FIRE_WORDS[i])!

      for (const row of rows) {
        if (done) break
        process.stdout.write(renderWordFrame([row], frame).replace(/\n$/, '') + '\n')
        frame++
        await sleep(55)
      }

      if (done) break
      await sleep(600)
      console.log()
    }

    // ── Phase 2: stopwatch ticks at bottom until results arrive ───────────
    if (!done) {
      process.stdout.write(renderStatusLine(Date.now() - startMs) + '\n')

      while (!done) {
        await sleep(100)
        if (done) break
        process.stdout.write('\x1B[1A\r\x1B[2K')
        process.stdout.write(renderStatusLine(Date.now() - startMs) + '\n')
      }

      // Clear the stopwatch line when done
      process.stdout.write('\x1B[1A\r\x1B[2K')
    }
  }

  let result: T
  try {
    const [r] = await Promise.all([
      promise.then((r) => { done = true; return r }),
      animate(),
    ])
    result = r
  } catch (err) {
    done = true
    await showCursor()
    throw err
  }

  const elapsedMs = Date.now() - startMs
  done = true
  return { result, elapsedMs }
}
