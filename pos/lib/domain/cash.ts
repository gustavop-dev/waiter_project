// Diferencia de arqueo: positiva sobra, negativa falta. "ok" dentro de la tolerancia (COP).
export const TOLERANCE = 500

export function cashDifference(expected: number, counted: number): { amount: number; tone: 'ok' | 'warn' | 'busy' } {
  const amount = Math.round(counted - expected)
  if (Math.abs(amount) <= TOLERANCE) return { amount, tone: 'ok' }
  return { amount, tone: amount > 0 ? 'warn' : 'busy' }
}
