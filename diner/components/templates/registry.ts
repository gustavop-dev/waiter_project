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
// --- familia E
import { E1Menu } from '@/components/templates/families/E/E1Menu'
import { E2Menu } from '@/components/templates/families/E/E2Menu'
import { E3Menu } from '@/components/templates/families/E/E3Menu'
import { E4Menu } from '@/components/templates/families/E/E4Menu'
import { E5Menu } from '@/components/templates/families/E/E5Menu'
import { FamilyECart } from '@/components/templates/families/E/FamilyECart'
import { FamilyEPay } from '@/components/templates/families/E/FamilyEPay'
// --- fin familia E
import type { CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'
import type { CodePattern, HistoryPattern, SignupPattern, TemplateFamily } from '@/lib/types'

export type { CartHrefs, CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'

export const MENU_LAYOUTS: Record<string, ComponentType<MenuLayoutProps>> = { B1: GenericMenu }
export const CART_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<CartLayoutProps>>> = { B: GenericCart }
export const PAY_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<PayLayoutProps>>> = { B: GenericPay }
export const SIGNUP_PATTERNS: Partial<Record<SignupPattern, ComponentType<SignupProps>>> = { banner5: GenericSignup }
export const CODE_PATTERNS: Partial<Record<CodePattern, ComponentType<CodeProps>>> = { casillas: GenericCode }
export const HISTORY_PATTERNS: Partial<Record<HistoryPattern, ComponentType<HistoryProps>>> = { porMes: GenericHistory }

// --- familia E
// Bar y cervecería: cinco menús por código y el carrito y pago de la familia (ramifican por template.codigo: E2, E3 y E5 difieren
// del base E1/E4). Sus patrones de cuenta (banner5/portada/beneficios, casillas/revisaCorreo/canal, tarjetas/tablaCufe/porMes) no
// son propios de la familia: los registran otras familias o caen al genérico.
Object.assign(MENU_LAYOUTS, { E1: E1Menu, E2: E2Menu, E3: E3Menu, E4: E4Menu, E5: E5Menu })
CART_LAYOUTS.E = FamilyECart
PAY_LAYOUTS.E = FamilyEPay
// --- fin familia E

export const menuLayout = (code: string | undefined): ComponentType<MenuLayoutProps> => (code && MENU_LAYOUTS[code.toUpperCase()]) || GenericMenu
export const cartLayout = (familia: TemplateFamily | string | undefined): ComponentType<CartLayoutProps> => CART_LAYOUTS[familia as TemplateFamily] ?? GenericCart
export const payLayout = (familia: TemplateFamily | string | undefined): ComponentType<PayLayoutProps> => PAY_LAYOUTS[familia as TemplateFamily] ?? GenericPay
export const signupPattern = (patron: SignupPattern | string | undefined): ComponentType<SignupProps> => SIGNUP_PATTERNS[patron as SignupPattern] ?? GenericSignup
export const codePattern = (patron: CodePattern | string | undefined): ComponentType<CodeProps> => CODE_PATTERNS[patron as CodePattern] ?? GenericCode
export const historyPattern = (patron: HistoryPattern | string | undefined): ComponentType<HistoryProps> => HISTORY_PATTERNS[patron as HistoryPattern] ?? GenericHistory
