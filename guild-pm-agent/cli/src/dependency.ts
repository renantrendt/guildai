export interface Issue {
  id: string
  github_issue_number: number
  title: string
  description: string
  type: string
  priority: string
  depends_on: string[]
  effort_weeks: number
  team: string
  blocks_deals: string[]
  unlocks_segment: string
  revenue_unlock_quarter: string
}

export interface Violation {
  blocked: string
  requires: string
  blockedTitle: string
  requiresTitle: string
}

export interface DependencyGraph {
  issues: Issue[]
  issueMap: Map<string, Issue>
  edges: Map<string, string[]>
  edgeCount: number
}

export function buildGraph(issues: Issue[]): DependencyGraph {
  const issueMap = new Map(issues.map((i) => [i.id, i]))
  const edges = new Map<string, string[]>()
  for (const issue of issues) edges.set(issue.id, issue.depends_on)
  const edgeCount = issues.reduce((sum, i) => sum + i.depends_on.length, 0)
  return { issues, issueMap, edges, edgeCount }
}

export function validateSequence(sequence: string[], graph: DependencyGraph): Violation[] {
  const shipped = new Set<string>()
  const violations: Violation[] = []
  for (const id of sequence) {
    const issue = graph.issueMap.get(id)
    if (!issue) continue
    for (const dep of issue.depends_on) {
      if (!shipped.has(dep)) {
        const depIssue = graph.issueMap.get(dep)
        violations.push({ blocked: id, requires: dep, blockedTitle: issue.title, requiresTitle: depIssue?.title ?? dep })
      }
    }
    shipped.add(id)
  }
  return violations
}

export function hasCircularDependency(graph: DependencyGraph): boolean {
  const visited = new Set<string>()
  const inStack = new Set<string>()
  function dfs(id: string): boolean {
    visited.add(id); inStack.add(id)
    for (const dep of graph.edges.get(id) ?? []) {
      if (!visited.has(dep)) { if (dfs(dep)) return true }
      else if (inStack.has(dep)) return true
    }
    inStack.delete(id)
    return false
  }
  for (const issue of graph.issues) {
    if (!visited.has(issue.id) && dfs(issue.id)) return true
  }
  return false
}
