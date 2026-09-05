import { AccountHome } from '@/components/templates/generic/AccountHome'
import { EmptyHistory } from '@/components/templates/generic/EmptyHistory'
import { GenericCart } from '@/components/templates/generic/GenericCart'
import { GenericCode } from '@/components/templates/generic/GenericCode'
import { GenericHistory } from '@/components/templates/generic/GenericHistory'
import { GenericMenu } from '@/components/templates/generic/GenericMenu'
import { GenericPay } from '@/components/templates/generic/GenericPay'
import { GenericSignup } from '@/components/templates/generic/GenericSignup'
import { CART_LAYOUTS, CODE_PATTERNS, HISTORY_PATTERNS, MENU_LAYOUTS, PAY_LAYOUTS, SIGNUP_PATTERNS, cartLayout, codePattern, historyPattern, menuLayout, payLayout, signupPattern } from '@/components/templates/registry'

// Falla si una clave que aún no existe (los 30 llegan en otra oleada) rompe el motor en vez de caer al genérico, o si una registrada no se respeta.
it('falls back to the generic layout for every missing key and honours registered ones', () => {
  expect(menuLayout('F5')).toBe(GenericMenu)
  expect(menuLayout(undefined)).toBe(GenericMenu)
  expect(menuLayout('b1')).toBe(MENU_LAYOUTS.B1)
  expect(cartLayout('F')).toBe(GenericCart)
  expect(cartLayout('familia-A')).toBe(GenericCart)
  expect(payLayout('E')).toBe(GenericPay)
  expect(signupPattern('portada')).toBe(GenericSignup)
  expect(codePattern('canal')).toBe(GenericCode)
  expect(historyPattern('tablaCufe')).toBe(GenericHistory)
  expect(historyPattern(undefined)).toBe(GenericHistory)

  const Custom = () => null
  MENU_LAYOUTS.F5 = Custom
  CART_LAYOUTS.F = Custom
  PAY_LAYOUTS.F = Custom
  SIGNUP_PATTERNS.portada = Custom
  CODE_PATTERNS.canal = Custom
  HISTORY_PATTERNS.tablaCufe = Custom
  try {
    expect(menuLayout('F5')).toBe(Custom)
    expect(cartLayout('F')).toBe(Custom)
    expect(payLayout('F')).toBe(Custom)
    expect(signupPattern('portada')).toBe(Custom)
    expect(codePattern('canal')).toBe(Custom)
    expect(historyPattern('tablaCufe')).toBe(Custom)
  } finally {
    delete MENU_LAYOUTS.F5; delete CART_LAYOUTS.F; delete PAY_LAYOUTS.F; delete SIGNUP_PATTERNS.portada; delete CODE_PATTERNS.canal; delete HISTORY_PATTERNS.tablaCufe
  }
})

// Falla si el genérico deja de ser B1 (la referencia del diseño) o si las pantallas fijas dejan de exportarse.
it('registers the generic set under B1 / family B / base patterns and exports the fixed screens', () => {
  expect(MENU_LAYOUTS.B1).toBe(GenericMenu)
  expect(CART_LAYOUTS.B).toBe(GenericCart)
  expect(PAY_LAYOUTS.B).toBe(GenericPay)
  expect(SIGNUP_PATTERNS.banner5).toBe(GenericSignup)
  expect(CODE_PATTERNS.casillas).toBe(GenericCode)
  expect(HISTORY_PATTERNS.porMes).toBe(GenericHistory)
  expect(typeof AccountHome).toBe('function')
  expect(typeof EmptyHistory).toBe('function')
})
