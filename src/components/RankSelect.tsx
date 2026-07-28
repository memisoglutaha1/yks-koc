import { Input, Select } from './Layout'
import { CUSTOM_RANK_VALUE, type RankOption } from '../data/rankOptions'

interface RankSelectProps {
  label: string
  value: number
  options: RankOption[]
  onChange: (value: number) => void
}

export function RankSelect({ label, value, options, onChange }: RankSelectProps) {
  const preset = options.some((o) => o.value === value)
  const selectValue = preset ? String(value) : String(CUSTOM_RANK_VALUE)

  return (
    <div className="space-y-2">
      <Select
        label={label}
        value={selectValue}
        onChange={(e) => {
          const next = parseInt(e.target.value)
          if (next === CUSTOM_RANK_VALUE) return
          onChange(next)
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={CUSTOM_RANK_VALUE}>Özel sıralama gir</option>
      </Select>
      {!preset && (
        <Input
          label="Özel hedef sıralama"
          type="number"
          min={1}
          value={String(value)}
          onChange={(e) => onChange(parseInt(e.target.value) || value)}
        />
      )}
    </div>
  )
}
