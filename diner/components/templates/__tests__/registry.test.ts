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
  // Claves que ninguna oleada registra (las familias A–F y los nueve patrones van llegando): el motor cae al genérico.
  expect(menuLayout('Z9')).toBe(GenericMenu)
  expect(menuLayout(undefined)).toBe(GenericMenu)
  expect(menuLayout('b1')).toBe(MENU_LAYOUTS.B1)
  expect(cartLayout('Z')).toBe(GenericCart)
  expect(cartLayout('familia-Z')).toBe(GenericCart)
  expect(payLayout('Z')).toBe(GenericPay)
  expect(signupPattern('inexistente')).toBe(GenericSignup)
  expect(codePattern('inexistente')).toBe(GenericCode)
  expect(historyPattern('inexistente')).toBe(GenericHistory)
  expect(historyPattern(undefined)).toBe(GenericHistory)

  const Custom = () => null
  const prev = { menu: MENU_LAYOUTS.F5, cart: CART_LAYOUTS.F, pay: PAY_LAYOUTS.F, signup: SIGNUP_PATTERNS.portada, code: CODE_PATTERNS.canal, history: HISTORY_PATTERNS.tablaCufe }
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
    // Se restaura lo que había (registrado por otra familia o nada) para no alterar el registro real.
    if (prev.menu) MENU_LAYOUTS.F5 = prev.menu; else delete MENU_LAYOUTS.F5
    if (prev.cart) CART_LAYOUTS.F = prev.cart; else delete CART_LAYOUTS.F
    if (prev.pay) PAY_LAYOUTS.F = prev.pay; else delete PAY_LAYOUTS.F
    if (prev.signup) SIGNUP_PATTERNS.portada = prev.signup; else delete SIGNUP_PATTERNS.portada
    if (prev.code) CODE_PATTERNS.canal = prev.code; else delete CODE_PATTERNS.canal
    if (prev.history) HISTORY_PATTERNS.tablaCufe = prev.history; else delete HISTORY_PATTERNS.tablaCufe
  }
})

// Falla si el genérico deja de ser B1 (la referencia del diseño) o si las pantallas fijas dejan de exportarse.
it('registers the generic set under B1 / family B / base patterns and exports the fixed screens', () => {
  expect(MENU_LAYOUTS).toMatchObject({ B1: GenericMenu })
  expect(CART_LAYOUTS).toMatchObject({ B: GenericCart })
  expect(PAY_LAYOUTS).toMatchObject({ B: GenericPay })
  expect(SIGNUP_PATTERNS).toMatchObject({ banner5: GenericSignup })
  expect(CODE_PATTERNS).toMatchObject({ casillas: GenericCode })
  expect(HISTORY_PATTERNS).toMatchObject({ porMes: GenericHistory })
  expect(typeof AccountHome).toBe('function')
  expect(typeof EmptyHistory).toBe('function')
})
