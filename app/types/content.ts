export type LocaleCode = 'en' | 'ru'

export type LocalizedText = Record<LocaleCode, string>

export type CreatorKind = 'streamer' | 'youtuber' | 'esports'

export type Platform = 'twitch' | 'youtube' | 'vk-video' | 'esports'

export type VerificationStatus = 'reported' | 'mixed' | 'research'

export type EquipmentStatus = 'confirmed' | 'reported' | 'historical'

export type EquipmentCategory
  = | 'cpu'
    | 'gpu'
    | 'motherboard'
    | 'memory'
    | 'psu'
    | 'monitor'
    | 'mouse'
    | 'keyboard'
    | 'microphone'
    | 'camera'
    | 'headset'
    | 'mousepad'
    | 'chair'
    | 'case'
    | 'storage'
    | 'cooling'

export interface Source {
  id: string
  title: LocalizedText
  publisher: string
  url: string
  sourceUpdatedAt?: string
  checkedAt: string
}

export interface EquipmentItem {
  category: EquipmentCategory
  name: string
  status: EquipmentStatus
  sourceIds: string[]
  note?: LocalizedText
  affiliateUrl?: Partial<Record<LocaleCode, string>>
}

export interface CreatorLocaleContent {
  seoTitle: string
  seoDescription: string
  eyebrow: string
  intro: string
  verdict: string
  researchNote?: string
}

export interface Creator {
  slug: string
  name: string
  realName?: LocalizedText
  aliases: string[]
  initials: string
  accent: string
  kinds: CreatorKind[]
  platforms: Platform[]
  game?: string
  featured: boolean
  indexable: boolean
  verificationStatus: VerificationStatus
  publishedAt: string
  updatedAt: string
  content: Record<LocaleCode, CreatorLocaleContent>
  equipment: EquipmentItem[]
  sources: Source[]
  socials?: Array<{
    label: string
    url: string
  }>
}
