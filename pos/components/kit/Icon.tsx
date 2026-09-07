import { IconAddressBook, IconAdjustments, IconAlarm, IconArmchair, IconArrowLeft, IconArrowRight, IconArrowsMaximize,
  IconArrowsMove, IconBabyCarriage, IconBackspace, IconBell, IconBox, IconBuildingStore, IconCalendarEvent, IconCash,
  IconCashBanknote, IconCashRegister, IconChartBar, IconCheck, IconChefHat, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconCircleCheck, IconClock, IconCreditCard, IconDeviceDesktop, IconDeviceMobile, IconDots, IconDotsVertical, IconFileInvoice,
  IconFileText, IconFingerprint, IconHash, IconHistory, IconLanguage, IconLayoutDashboard, IconLoader2, IconLock, IconLogout,
  IconMail, IconMapPin, IconMinus, IconPackage, IconPencil, IconPhone, IconPhoto, IconPlus, IconPrinter, IconQrcode,
  IconReceipt, IconRefresh, IconRotate, IconSearch, IconSettings, IconShoppingBag, IconShoppingCart, IconToolsKitchen2,
  IconTrash, IconTruckDelivery, IconUpload, IconUser, IconUsers, IconX, type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

// Nombres del kit → Tabler Icons (el kit los declara en su página "Icons"). Solo se añaden aquí.
const ICONS = {
  dashboard: IconLayoutDashboard, orders: IconFileText, tables: IconDeviceDesktop, reservations: IconCalendarEvent,
  history: IconHistory, inventory: IconBox, cash: IconCashRegister, kitchen: IconToolsKitchen2, admin: IconAdjustments,
  sales: IconChartBar, catalog: IconPackage, customers: IconAddressBook, billing: IconFileInvoice, settings: IconSettings,
  bell: IconBell, search: IconSearch, plus: IconPlus, minus: IconMinus, close: IconX, check: IconCheck,
  chevronDown: IconChevronDown, chevronLeft: IconChevronLeft, chevronRight: IconChevronRight, arrowLeft: IconArrowLeft,
  arrowRight: IconArrowRight, more: IconDotsVertical, trash: IconTrash, edit: IconPencil, backspace: IconBackspace,
  user: IconUser, users: IconUsers, clock: IconClock, alarm: IconAlarm, printer: IconPrinter, money: IconCash,
  card: IconCreditCard, qr: IconQrcode, receipt: IconReceipt, cart: IconShoppingCart, logout: IconLogout, lock: IconLock,
  photo: IconPhoto, chef: IconChefHat, move: IconArrowsMove, rotate: IconRotate, mail: IconMail, fingerprint: IconFingerprint,
  language: IconLanguage, babyChair: IconBabyCarriage, delivery: IconTruckDelivery, store: IconBuildingStore,
  moreHorizontal: IconDots, refresh: IconRefresh, upload: IconUpload, bag: IconShoppingBag, hash: IconHash,
  expand: IconArrowsMaximize, armchair: IconArmchair, terminal: IconDeviceMobile, banknote: IconCashBanknote,
  mapPin: IconMapPin, phone: IconPhone, loader: IconLoader2, circleCheck: IconCircleCheck,
} satisfies Record<string, ComponentType<IconProps>>

export type KitIcon = keyof typeof ICONS
export const KIT_ICON_NAMES = Object.keys(ICONS) as KitIcon[]

export function Icon({ name, size = 20, className, label }: { name: KitIcon; size?: number; className?: string; label?: string }) {
  const Cmp = ICONS[name]
  return label
    ? <Cmp size={size} stroke={1.75} className={className} role="img" aria-label={label} />
    : <Cmp size={size} stroke={1.75} className={className} aria-hidden="true" />
}
