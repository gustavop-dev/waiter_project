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
// --- familia A
import { A1Menu } from '@/components/templates/families/A/A1Menu'
import { A2Menu } from '@/components/templates/families/A/A2Menu'
import { A3Menu } from '@/components/templates/families/A/A3Menu'
import { A4Menu } from '@/components/templates/families/A/A4Menu'
import { A5Menu } from '@/components/templates/families/A/A5Menu'
import { FamilyACart } from '@/components/templates/families/A/FamilyACart'
import { FamilyAPay } from '@/components/templates/families/A/FamilyAPay'
import { PortadaSignup } from '@/components/templates/patterns/PortadaSignup'
import { RevisaCorreoCode } from '@/components/templates/patterns/RevisaCorreoCode'
import { TablaCufeHistory } from '@/components/templates/patterns/TablaCufeHistory'
// --- fin familia A

export type { CartHrefs, CartLayoutProps, CodeProps, HistoryProps, MenuLayoutProps, PayLayoutProps, SignupProps } from '@/components/templates/types'

export const MENU_LAYOUTS: Record<string, ComponentType<MenuLayoutProps>> = { B1: GenericMenu }
export const CART_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<CartLayoutProps>>> = { B: GenericCart }
export const PAY_LAYOUTS: Partial<Record<TemplateFamily, ComponentType<PayLayoutProps>>> = { B: GenericPay }
export const SIGNUP_PATTERNS: Partial<Record<SignupPattern, ComponentType<SignupProps>>> = { banner5: GenericSignup }
export const CODE_PATTERNS: Partial<Record<CodePattern, ComponentType<CodeProps>>> = { casillas: GenericCode }
export const HISTORY_PATTERNS: Partial<Record<HistoryPattern, ComponentType<HistoryProps>>> = { porMes: GenericHistory }

// --- familia A
// Alta cocina: cinco menús por código; carrito y pago por familia (A3/A4 y A3/A5 se ramifican dentro por template.codigo, el registro solo
// admite claves por familia); patrones de cuenta propios de la familia, reutilizables por cualquier plantilla.
MENU_LAYOUTS.A1 = A1Menu
MENU_LAYOUTS.A2 = A2Menu
MENU_LAYOUTS.A3 = A3Menu
MENU_LAYOUTS.A4 = A4Menu
MENU_LAYOUTS.A5 = A5Menu
CART_LAYOUTS.A = FamilyACart
PAY_LAYOUTS.A = FamilyAPay
SIGNUP_PATTERNS.portada = PortadaSignup
CODE_PATTERNS.revisaCorreo = RevisaCorreoCode
HISTORY_PATTERNS.tablaCufe = TablaCufeHistory
// --- fin familia A

export const menuLayout = (code: string | undefined): ComponentType<MenuLayoutProps> => (code && MENU_LAYOUTS[code.toUpperCase()]) || GenericMenu
export const cartLayout = (familia: TemplateFamily | string | undefined): ComponentType<CartLayoutProps> => CART_LAYOUTS[familia as TemplateFamily] ?? GenericCart
export const payLayout = (familia: TemplateFamily | string | undefined): ComponentType<PayLayoutProps> => PAY_LAYOUTS[familia as TemplateFamily] ?? GenericPay
export const signupPattern = (patron: SignupPattern | string | undefined): ComponentType<SignupProps> => SIGNUP_PATTERNS[patron as SignupPattern] ?? GenericSignup
export const codePattern = (patron: CodePattern | string | undefined): ComponentType<CodeProps> => CODE_PATTERNS[patron as CodePattern] ?? GenericCode
export const historyPattern = (patron: HistoryPattern | string | undefined): ComponentType<HistoryProps> => HISTORY_PATTERNS[patron as HistoryPattern] ?? GenericHistory
