import { type DependencyGraph, type Issue, type Violation, validateSequence } from './dependency.js'

export interface Scenario {
  name: string
  label: string
  sequence: string[]
  violations: Violation[]
  totalWeeks: number
}

function totalEffort(sequence: string[], issueMap: Map<string, Issue>): number {
  return sequence.reduce((sum, id) => sum + (issueMap.get(id)?.effort_weeks ?? 0), 0)
}

function reorder(ids: string[], graph: DependencyGraph, sortFn: (a: Issue, b: Issue) => number): string[] {
  const available = new Set(ids)
  const shipped = new Set<string>()
  const result: string[] = []
  const maxPasses = ids.length * 2
  for (let pass = 0; pass < maxPasses && result.length < ids.length; pass++) {
    const ready = [...available].filter((id) => {
      const issue = graph.issueMap.get(id)
      return issue?.depends_on.every((dep) => shipped.has(dep) || !available.has(dep))
    })
    if (ready.length === 0) {
      for (const id of ids) {
        if (available.has(id)) { result.push(id); available.delete(id); shipped.add(id) }
      }
      break
    }
    const next = ready.map((id) => graph.issueMap.get(id)!).filter(Boolean).sort(sortFn)[0]
    result.push(next.id); available.delete(next.id); shipped.add(next.id)
  }
  return result
}

export function generateScenarios(graph: DependencyGraph): Scenario[] {
  const ids = graph.issues.map((i) => i.id)
  const scenarioDefs: Array<{ name: string; label: string; sortFn: (a: Issue, b: Issue) => number }> = [
    {
      name: 'Enterprise First',
      label: 'Close pipeline before shipping features',
      sortFn: (a, b) => {
        const dealScore = (i: Issue) => i.blocks_deals.length * 10 + (i.type === 'compliance' ? 5 : 0)
        return dealScore(b) - dealScore(a)
      },
    },
    {
      name: 'Hub Launch Sprint',
      label: 'Fastest path to Agent Hub GA',
      sortFn: (a, b) => {
        const hubScore = (i: Issue) => ['G-014', 'G-011', 'G-006', 'G-002'].includes(i.id) ? 10 : i.unlocks_segment === 'growth' ? 5 : 0
        return hubScore(b) - hubScore(a) || a.effort_weeks - b.effort_weeks
      },
    },
    {
      name: 'Revenue Optimized',
      label: 'Ship highest revenue unlock first',
      sortFn: (a, b) => {
        const qs = (q: string) => ({ Q2: 3, Q3: 2, Q4: 1 }[q] ?? 0)
        return (qs(b.revenue_unlock_quarter) * 10 - b.effort_weeks) - (qs(a.revenue_unlock_quarter) * 10 - a.effort_weeks)
      },
    },
    {
      name: 'Risk Minimized',
      label: 'Resolve all dependencies before shipping',
      sortFn: (a, b) => {
        const depth = (i: Issue): number => i.depends_on.length === 0 ? 0 : 1 + Math.max(...i.depends_on.map((dep) => { const d = graph.issueMap.get(dep); return d ? depth(d) : 0 }))
        return depth(a) - depth(b) || a.effort_weeks - b.effort_weeks
      },
    },
  ]
  return scenarioDefs.map(({ name, label, sortFn }) => {
    const sequence = reorder(ids, graph, sortFn)
    const violations = validateSequence(sequence, graph)
    const weeks = totalEffort(sequence, graph.issueMap)
    return { name, label, sequence, violations, totalWeeks: weeks }
  })
}
