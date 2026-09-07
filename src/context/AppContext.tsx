import { createContext, useContext, type ReactNode } from 'react'
import { useAppStore, type AppStore } from '../hooks/useAppStore'

const AppContext = createContext<AppStore | null>(null)

export function AppProvider({
  userId,
  studentDisplayName,
  children,
}: {
  userId: string
  studentDisplayName?: string
  children: ReactNode
}) {
  const store = useAppStore(userId, studentDisplayName)
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
