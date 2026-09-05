import { cashDifference } from '@/lib/domain/cash'

// Falla si un faltante se pinta como sobrante, o si una diferencia de monedas se marca como problema.
it('grades the counted cash against the expected amount', () => {
  expect(cashDifference(100000, 100300)).toEqual({ amount: 300, tone: 'ok' })
  expect(cashDifference(100000, 90000)).toEqual({ amount: -10000, tone: 'busy' })
  expect(cashDifference(100000, 112000)).toEqual({ amount: 12000, tone: 'warn' })
})
