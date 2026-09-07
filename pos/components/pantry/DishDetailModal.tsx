'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { dishImage } from '@/components/pantry/DishCard'
import { LevelBadge } from '@/components/pantry/LevelBadge'
import { formatQty, ingredientLevel, unitDisplayName, type DishView, type Ingredient } from '@/lib/domain/pantry'

export const ingredientImage = (id: number) => `/odoo/web/image/product.template/${id}/image_256`

export function IngredientPhoto({ ingredient, size }: { ingredient: Ingredient | undefined; size: 40 | 48 }) {
  const t = useTranslations('pantry.ingredients')
  const cls = size === 48 ? 'w-12 h-12' : 'w-10 h-10'
  return (
    <span className={`${cls} shrink-0 rounded-sm overflow-hidden bg-muted grid place-items-center text-dim`}>
      {ingredient?.hasImage ? <img src={ingredientImage(ingredient.id)} alt="" className="w-full h-full object-cover" /> : <Icon name="photo" size={size === 48 ? 22 : 18} label={t('noPhoto')} />}
    </span>
  )
}

// "Detail Dish" del kit: el plato con su categoría, raciones y nivel, y la receta en dos columnas con el nivel de cada ingrediente.
export function DishDetailModal({ dish, category, ingredients, onClose }: { dish: DishView | null; category: string; ingredients: Map<number, Ingredient>; onClose: () => void }) {
  const t = useTranslations('pantry')
  return (
    <Modal open={dish !== null} onClose={onClose} title={t('detail.title')} size="center">
      {dish && (
        <div className="p-4 flex flex-col gap-4 min-h-[420px]">
          <section className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold text-ink">{t('detail.dish')}</h3>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 shrink-0 rounded-sm overflow-hidden bg-muted grid place-items-center text-dim">
                {dish.hasImage ? <img src={dishImage(dish.id)} alt="" className="w-full h-full object-cover" /> : <Icon name="photo" size={22} />}
              </span>
              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold text-ink">{dish.name}</p>
                <p className="text-[13px] text-soft flex items-center gap-1.5">
                  <span>{category}</span><span aria-hidden>•</span>
                  <span>{dish.servings === null ? t('menu.noRecipe') : t('detail.canServe', { n: dish.servings })}</span>
                  <LevelBadge level={dish.level} />
                </p>
              </div>
            </div>
          </section>
          <section className="flex flex-col gap-2.5 border-t border-border pt-4">
            <h3 className="text-[15px] font-semibold text-ink">{t('detail.ingredients')}</h3>
            {dish.recipe === null || dish.recipe.length === 0 ? <p className="text-[14px] text-soft">{t('detail.noRecipe')}</p> : (
              <ul className="grid grid-cols-2 gap-2">
                {dish.recipe.map((line) => {
                  const ing = ingredients.get(line.ingredientId)
                  return (
                    <li key={line.lineId} className="bg-muted rounded-sm p-2 flex items-center gap-2.5">
                      <IngredientPhoto ingredient={ing} size={40} />
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="text-[14px] font-medium text-ink truncate">{line.name}</span>
                        <span className="text-[13px] text-soft">{formatQty(line.qty)} {unitDisplayName(line.uomName)}</span>
                      </div>
                      <LevelBadge level={ing ? ingredientLevel(ing) : null} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}
