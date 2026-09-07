import {
  IconAddressBook, IconAdjustments, IconAlarm, IconArrowLeft, IconArrowRight, IconArrowsMove, IconBabyCarriage, IconBackspace,
  IconBell, IconBox, IconBuildingStore, IconCalendarEvent, IconCash, IconCashRegister, IconChartBar, IconCheck, IconChecks, IconChefHat,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconClock, IconCreditCard, IconDeviceDesktop, IconDotsVertical,
  IconFileInvoice, IconFileText, IconFingerprint, IconHistory, IconLanguage, IconLayoutDashboard, IconLock, IconLogout,
  IconMail, IconMinus, IconPackage, IconPencil, IconPhoto, IconPlus, IconPrinter, IconQrcode, IconReceipt, IconRotate,
  IconSearch, IconSettings, IconShoppingCart, IconToolsKitchen2, IconTrash, IconTruckDelivery, IconUser, IconUsers, IconX,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

// Nombres del kit → Tabler Icons (el kit los declara en su página "Icons"). Solo se añaden aquí.
const ICONS = {
  dashboard: IconLayoutDashboard, orders: IconFileText, tables: IconDeviceDesktop, reservations: IconCalendarEvent,
  history: IconHistory, inventory: IconBox, cash: IconCashRegister, kitchen: IconToolsKitchen2, admin: IconAdjustments,
  sales: IconChartBar, catalog: IconPackage, customers: IconAddressBook, billing: IconFileInvoice, settings: IconSettings,
  bell: IconBell, search: IconSearch, plus: IconPlus, minus: IconMinus, close: IconX, check: IconCheck,
  chevronDown: IconChevronDown, chevronLeft: IconChevronLeft, chevronRight: IconChevronRight,
  arrowLeft: IconArrowLeft, arrowRight: IconArrowRight, more: IconDotsVertical,
  trash: IconTrash, edit: IconPencil, backspace: IconBackspace, user: IconUser, users: IconUsers, clock: IconClock, alarm: IconAlarm,
  printer: IconPrinter, money: IconCash, card: IconCreditCard, qr: IconQrcode, receipt: IconReceipt, cart: IconShoppingCart,
  logout: IconLogout, lock: IconLock, photo: IconPhoto, chef: IconChefHat, move: IconArrowsMove, rotate: IconRotate,
  mail: IconMail, fingerprint: IconFingerprint, language: IconLanguage, babyChair: IconBabyCarriage, delivery: IconTruckDelivery,
  store: IconBuildingStore, checks: IconChecks,
} satisfies Record<string, ComponentType<IconProps>>

export type KitIcon = keyof typeof ICONS
export const KIT_ICON_NAMES = Object.keys(ICONS) as KitIcon[]

export function Icon({ name, size = 20, className, label }: { name: KitIcon; size?: number; className?: string; label?: string }) {
  const Cmp = ICONS[name]
  return label
    ? <Cmp size={size} stroke={1.75} className={className} role="img" aria-label={label} />
    : <Cmp size={size} stroke={1.75} className={className} aria-hidden="true" />
}
