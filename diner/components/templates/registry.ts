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
import type { CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'
import type { CodePattern, HistoryPattern, SignupPattern, TemplateFamily } from '@/lib/types'
// --- familia C
import { C1Menu } from '@/components/templates/families/C/C1Menu'
import { C2Menu } from '@/components/templates/families/C/C2Menu'
import { C3Menu } from '@/components/templates/families/C/C3Menu'
import { C4Menu } from '@/components/templates/families/C/C4Menu'
import { C5Menu } from '@/components/templates/families/C/C5Menu'
import { FamilyCCart } from '@/components/templates/families/C/FamilyCCart'
import { FamilyCPay } from '@/components/templates/families/C/FamilyCPay'
import { BenefitsSignup } from '@/components/templates/patterns/BenefitsSignup'
import { ChannelCode } from '@/components/templates/patterns/ChannelCode'
// --- fin familia C

export type { CartHrefs, CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'

export const MENU_LAYOUTS: Record<string, ComponentType<MenuLayoutProps>> = { B1: GenericMenu }
export const CART_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<CartLayoutProps>>> = { B: GenericCart }
export const PAY_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<PayLayoutProps>>> = { B: GenericPay }
export const SIGNUP_PATTERNS: Partial<Record<SignupPattern, ComponentType<SignupProps>>> = { banner5: GenericSignup }
export const CODE_PATTERNS: Partial<Record<CodePattern, ComponentType<CodeProps>>> = { casillas: GenericCode }
export const HISTORY_PATTERNS: Partial<Record<HistoryPattern, ComponentType<HistoryProps>>> = { porMes: GenericHistory }

// --- familia C
// Rápida y food truck: cinco menús por código, carrito y pago por familia (C3 y C5 ramifican dentro por template.codigo) y los
// patrones de cuenta que esta familia introduce (beneficios, canal); tarjetas y tablaCufe llegan con otras familias.
Object.assign(MENU_LAYOUTS, { C1: C1Menu, C2: C2Menu, C3: C3Menu, C4: C4Menu, C5: C5Menu })
CART_LAYOUTS.C = FamilyCCart
PAY_LAYOUTS.C = FamilyCPay
SIGNUP_PATTERNS.beneficios = BenefitsSignup
CODE_PATTERNS.canal = ChannelCode
// --- fin familia C

export const menuLayout = (code: string | undefined): ComponentType<MenuLayoutProps> => (code && MENU_LAYOUTS[code.toUpperCase()]) || GenericMenu
export const cartLayout = (familia: TemplateFamily | string | undefined): ComponentType<CartLayoutProps> => CART_LAYOUTS[familia as TemplateFamily] ?? GenericCart
export const payLayout = (familia: TemplateFamily | string | undefined): ComponentType<PayLayoutProps> => PAY_LAYOUTS[familia as TemplateFamily] ?? GenericPay
export const signupPattern = (patron: SignupPattern | string | undefined): ComponentType<SignupProps> => SIGNUP_PATTERNS[patron as SignupPattern] ?? GenericSignup
export const codePattern = (patron: CodePattern | string | undefined): ComponentType<CodeProps> => CODE_PATTERNS[patron as CodePattern] ?? GenericCode
export const historyPattern = (patron: HistoryPattern | string | undefined): ComponentType<HistoryProps> => HISTORY_PATTERNS[patron as HistoryPattern] ?? GenericHistory
