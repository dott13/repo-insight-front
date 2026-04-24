import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface RepoCardProps {
  name: string
  qualifier: string
  metric: string
  variant?: "default" | "secondary" | "outline"
}

export function RepoCard({ name, qualifier, metric, variant = "secondary" }: RepoCardProps) {
  return (
    <Card className="hover:border-primary transition-all cursor-pointer bg-zinc-900/50 border-zinc-800 h-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm font-mono break-all leading-tight text-zinc-200">
                {name}
            </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            {qualifier}
          </span>
          <div className="text-lg font-bold text-white">
            {metric}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}