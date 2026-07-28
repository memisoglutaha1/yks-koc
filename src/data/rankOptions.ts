export interface RankOption {
  value: number
  label: string
}

export const TYT_RANK_OPTIONS: RankOption[] = [
  { value: 10000, label: 'İlk 10.000' },
  { value: 25000, label: 'İlk 25.000' },
  { value: 50000, label: 'İlk 50.000' },
  { value: 100000, label: 'İlk 100.000' },
  { value: 200000, label: 'İlk 200.000' },
  { value: 300000, label: 'İlk 300.000' },
  { value: 500000, label: 'İlk 500.000' },
]

export const AYT_RANK_OPTIONS: RankOption[] = [
  { value: 1000, label: 'İlk 1.000' },
  { value: 5000, label: 'İlk 5.000' },
  { value: 10000, label: 'İlk 10.000' },
  { value: 20000, label: 'İlk 20.000' },
  { value: 50000, label: 'İlk 50.000' },
  { value: 100000, label: 'İlk 100.000' },
  { value: 200000, label: 'İlk 200.000' },
]

export const CUSTOM_RANK_VALUE = -1

export function findRankOption(options: RankOption[], value: number): RankOption | undefined {
  return options.find((o) => o.value === value)
}

export function formatRank(value: number): string {
  return value.toLocaleString('tr-TR')
}
