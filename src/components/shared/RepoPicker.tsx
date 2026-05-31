    import { useReposList } from '@/hooks/useReposList'
import type { RepoListItem } from '@/hooks/useReposList'

interface RepoPickerProps {
  label: string
  value: string
  onChange: (id: string) => void
  exclude?: string   // hide this repo from the dropdown
  items: RepoListItem[]
}

export function RepoPicker({ label, value, onChange, exclude, items }: RepoPickerProps) {
  const selected = items.find(r => r.id === value)

  return (
    <div className="flex-1 relative">
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="
            w-full appearance-none
            rounded-xl bg-zinc-900/50 border border-zinc-800
            px-4 py-2.5 pr-8
            text-sm font-mono text-zinc-200
            focus:outline-none focus:border-zinc-600
            hover:border-zinc-700 transition-colors
            cursor-pointer
          "
        >
          <option value="" className="bg-zinc-900 text-zinc-500">Select repository…</option>
          {items
            .filter(r => r.id !== exclude)
            .map(r => (
              <option key={r.id} value={r.id} className="bg-zinc-900 text-zinc-200">
                {r.fullName}
              </option>
            ))}
        </select>
        {/* Caret */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
          ▾
        </span>
      </div>
      {selected && (
        <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate px-1">
          {selected.description ?? '\u00A0'}
        </p>
      )}
    </div>
  )
}

interface CompareHeaderProps {
  repoAId: string
  repoBId: string
  onChangeA: (id: string) => void
  onChangeB: (id: string) => void
}

export function CompareHeader({ repoAId, repoBId, onChangeA, onChangeB }: CompareHeaderProps) {
  const { items } = useReposList()

  return (
    <div className="flex items-end gap-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800">
      <RepoPicker
        label="Repo A"
        value={repoAId}
        onChange={onChangeA}
        exclude={repoBId}
        items={items}
      />
      <span className="text-zinc-600 font-mono text-sm pb-3 shrink-0">vs</span>
      <RepoPicker
        label="Repo B"
        value={repoBId}
        onChange={onChangeB}
        exclude={repoAId}
        items={items}
      />
    </div>
  )
}