import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/graph')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/graph"!</div>
}
