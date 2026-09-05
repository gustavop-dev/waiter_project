// Contrato 4 · Registro de layouts del motor. El menú se registra por código ("A1"…"F5"), carrito y pago por familia
// ('A'…'F') y las pantallas de cuenta por patrón. Una clave que falta cae al genérico (B1 es la referencia del genérico),
// así el motor funciona antes de que existan los 30 y una plantilla nueva es un JSON + su layout aquí.
import type { ComponentType } from 'react'

import { GenericCart } from '@/components/templates/generic/GenericCart'
import { GenericCode } from '@/components/templates/generic/GenericCode'
import { GenericHistory } from '@/components/templates/generic/GenericHistory'
import { GenericMenu } from '@/components/templates/generic/GenericMenu'
import { GenericPay } from '@/components/templates/generic/GenericPay'
import { GenericSignup } from '@/components/templates/generic/GenericSignup'
// --- familia F
import { F1Menu } from '@/components/templates/families/F/F1Menu'
import { F2Menu } from '@/components/templates/families/F/F2Menu'
import { F3Menu } from '@/components/templates/families/F/F3Menu'
import { F4Menu } from '@/components/templates/families/F/F4Menu'
import { F5Menu } from '@/components/templates/families/F/F5Menu'
import { FamilyFCart } from '@/components/templates/families/F/FamilyFCart'
import { FamilyFPay } from '@/components/templates/families/F/FamilyFPay'
// --- fin familia F
import type { CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'
import type { CodePattern, HistoryPattern, SignupPattern, TemplateFamily } from '@/lib/types'

export type { CartHrefs, CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'

export const MENU_LAYOUTS: Record<string, ComponentType<MenuLayoutProps>> = { B1: GenericMenu }
export const CART_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<CartLayoutProps>>> = { B: GenericCart }
export const PAY_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<PayLayoutProps>>> = { B: GenericPay }
export const SIGNUP_PATTERNS: Partial<Record<SignupPattern, ComponentType<SignupProps>>> = { banner5: GenericSignup }
export const CODE_PATTERNS: Partial<Record<CodePattern, ComponentType<CodeProps>>> = { casillas: GenericCode }
export const HISTORY_PATTERNS: Partial<Record<HistoryPattern, ComponentType<HistoryProps>>> = { porMes: GenericHistory }

// --- familia F
MENU_LAYOUTS.F1 = F1Menu
MENU_LAYOUTS.F2 = F2Menu
MENU_LAYOUTS.F3 = F3Menu
MENU_LAYOUTS.F4 = F4Menu
MENU_LAYOUTS.F5 = F5Menu
CART_LAYOUTS.F = FamilyFCart
PAY_LAYOUTS.F = FamilyFPay
// --- fin familia F

export const menuLayout = (code: string | undefined): ComponentType<MenuLayoutProps> => (code && MENU_LAYOUTS[code.toUpperCase()]) || GenericMenu
export const cartLayout = (familia: TemplateFamily | string | undefined): ComponentType<CartLayoutProps> => CART_LAYOUTS[familia as TemplateFamily] ?? GenericCart
export const payLayout = (familia: TemplateFamily | string | undefined): ComponentType<PayLayoutProps> => PAY_LAYOUTS[familia as TemplateFamily] ?? GenericPay
export const signupPattern = (patron: SignupPattern | string | undefined): ComponentType<SignupProps> => SIGNUP_PATTERNS[patron as SignupPattern] ?? GenericSignup
export const codePattern = (patron: CodePattern | string | undefined): ComponentType<CodeProps> => CODE_PATTERNS[patron as CodePattern] ?? GenericCode
export const historyPattern = (patron: HistoryPattern | string | undefined): ComponentType<HistoryProps> => HISTORY_PATTERNS[patron as HistoryPattern] ?? GenericHistory
