import {
  IconAddressBook, IconAdjustments, IconAlarm, IconAlertTriangle, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp,
  IconArrowsMove, IconBabyCarriage, IconBackspace, IconBell, IconBox, IconBuildingStore, IconCalendarEvent, IconCash,
  IconCashRegister, IconChartBar, IconChartLine, IconCheck, IconChefHat, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconClock, IconCreditCard, IconDeviceDesktop, IconDeviceTablet, IconDotsVertical, IconFileInvoice, IconFileText,
  IconFileTypePdf, IconFilter, IconFingerprint, IconFlame, IconGift, IconHistory, IconLanguage, IconLayout2,
  IconLayoutDashboard, IconLayoutGrid, IconLock, IconLogout, IconMail, IconMapPin, IconMinus, IconPackage, IconPalette,
  IconPencil, IconPercentage, IconPhone, IconPhoto, IconPlus, IconPrinter, IconQrcode, IconReceipt, IconRefresh, IconRotate,
  IconSearch, IconSettings, IconShoppingCart, IconStar, IconStarFilled, IconTag, IconToolsKitchen2, IconTrash,
  IconTruckDelivery, IconUser, IconUsers, IconVolume, IconVolumeOff, IconWallet, IconX,
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
  store: IconBuildingStore,
  // Superficies sin equivalente en el kit (oleada I.7): KDS, caja, catálogo, clientes, facturación, configuración.
  refresh: IconRefresh, star: IconStar, starFilled: IconStarFilled, volume: IconVolume, volumeOff: IconVolumeOff, flame: IconFlame,
  tag: IconTag, alert: IconAlertTriangle, filter: IconFilter, arrowUp: IconArrowUp, arrowDown: IconArrowDown, wallet: IconWallet,
  gift: IconGift, phone: IconPhone, mapPin: IconMapPin, pdf: IconFileTypePdf, palette: IconPalette, layout: IconLayout2,
  grid: IconLayoutGrid, percentage: IconPercentage, chartLine: IconChartLine, tablet: IconDeviceTablet,
} satisfies Record<string, ComponentType<IconProps>>

export type KitIcon = keyof typeof ICONS
export const KIT_ICON_NAMES = Object.keys(ICONS) as KitIcon[]

export function Icon({ name, size = 20, className, label }: { name: KitIcon; size?: number; className?: string; label?: string }) {
  const Cmp = ICONS[name]
  return label
    ? <Cmp size={size} stroke={1.75} className={className} role="img" aria-label={label} />
    : <Cmp size={size} stroke={1.75} className={className} aria-hidden="true" />
}
