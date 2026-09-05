'use client'

import { create } from 'zustand'

import { currentUser, getOpenSession, login as loginRequest, logout as logoutRequest } from '@/lib/services/session'
import type { AuthUser, PosSession } from '@/lib/services/session'

interface AuthState {
  user: AuthUser | null
  session: PosSession | null
  hydrated: boolean
  login: (login: string, password: string) => Promise<void>
  hydrate: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  hydrated: false,
  login: async (l, p) => {
    const user = await loginRequest(l, p)
    const session = await getOpenSession()
    set({ user, session, hydrated: true })
  },
  // La cookie de Odoo es HttpOnly: la única forma de saber si hay sesión es preguntar.
  hydrate: async () => {
    try {
      const user = await currentUser()
      const session = user ? await getOpenSession() : null
      set({ session, user, hydrated: true })
    } catch {
      set({ user: null, session: null, hydrated: true })
    }
  },
  logout: async () => {
    await logoutRequest()
    set({ user: null, session: null })
  },
}))
