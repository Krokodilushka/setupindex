<script setup lang="ts">
import type { Creator, CreatorKind, EquipmentCategory, EquipmentStatus, Platform, VerificationStatus } from '../types/content'
import { creatorAccent } from '#shared/utils/creator-accent'

interface StoredCreator {
  document: Creator
  version: number
}

interface AdminStatus {
  configured: boolean
  authenticated: boolean
  devMode: boolean
}

interface ImportPreviewItem {
  action: 'create' | 'update'
  slug: string
  valid: boolean
  problems: string[]
  changedFields: string[]
  equipmentBefore: number
  equipmentAfter: number
  sourcesBefore: number
  sourcesAfter: number
}

interface ImportPreview {
  valid: boolean
  signature?: string
  items: ImportPreviewItem[]
}

type AdminTab = 'creators' | 'content' | 'import'

const props = defineProps<{
  creatorSlug?: string
}>()

useSeoMeta({
  title: 'Админ-панель',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const localePath = useLocalePath()
const { data: status, refresh: refreshStatus } = await useFetch<AdminStatus>('/api/admin/status', {
  default: () => ({ configured: false, authenticated: false, devMode: false }),
})
const { fetch: fetchSession } = useUserSession()
const requestFetch = useRequestFetch()
const {
  register,
  authenticate,
  isSupported: webAuthnSupported,
} = useWebAuthn({
  registerEndpoint: '/api/admin/webauthn/register',
  authenticateEndpoint: '/api/admin/webauthn/authenticate',
})

const tab = ref<AdminTab>(route.query.view === 'import' && props.creatorSlug === undefined ? 'import' : 'creators')
const authPending = ref(false)
const authError = ref('')
const records = ref<StoredCreator[]>([])
const editor = ref<Creator | null>(null)
const editorVersion = ref<number | null>(null)
const originalSlug = ref('')
const savePending = ref(false)
const notice = ref('')
const error = ref('')
const importText = ref('')
const importBatch = ref<Record<string, unknown>>()
const importPreview = ref<ImportPreview>()
const importPending = ref(false)
const creatorSearch = ref('')
const sessionExpired = ref(false)

const filteredRecords = computed(() => {
  const query = creatorSearch.value.trim().toLocaleLowerCase('ru')
  if (!query)
    return records.value

  return records.value.filter(({ document }) => [
    document.name,
    document.slug,
    document.realName?.ru,
    document.realName?.en,
    document.game,
    ...document.aliases,
    ...document.kinds,
    ...document.platforms,
  ].some(value => value?.toLocaleLowerCase('ru').includes(query)))
})

watch(() => editor.value?.slug, (slug) => {
  if (editor.value)
    editor.value.accent = creatorAccent(slug || '')
})

const creatorKinds: CreatorKind[] = ['streamer', 'youtuber', 'esports']
const platforms: Platform[] = ['twitch', 'youtube', 'vk-video', 'esports']
const verificationStatuses: VerificationStatus[] = ['confirmed', 'reported', 'mixed', 'research']
const equipmentStatuses: EquipmentStatus[] = ['confirmed', 'reported', 'historical']
const equipmentCategories: EquipmentCategory[] = [
  'cpu',
  'gpu',
  'motherboard',
  'memory',
  'psu',
  'laptop',
  'monitor',
  'mouse',
  'keyboard',
  'microphone',
  'audio-interface',
  'speakers',
  'camera',
  'headset',
  'mousepad',
  'chair',
  'case',
  'storage',
  'cooling',
]

const gameSuggestions = computed(() => uniqueSorted(
  records.value.map(record => record.document.game).filter((value): value is string => Boolean(value)),
))

const publisherSuggestions = computed(() => uniqueSorted(
  [
    ...Object.values(knownPublisherByHost),
    ...records.value.flatMap(record => record.document.sources.map(source => source.publisher)),
  ],
))

const socialLabelSuggestions = computed(() => uniqueSorted([
  'Twitch',
  'YouTube',
  'VK Видео',
  'Telegram',
  'X / Twitter',
  ...records.value.flatMap(record =>
    record.document.socials?.map(social => social.label) || [],
  ),
]))

const equipmentSuggestionsByCategory = computed(() => Object.fromEntries(
  equipmentCategories.map(category => [
    category,
    uniqueSorted(records.value.flatMap(record =>
      record.document.equipment
        .filter(item => item.category === category)
        .map(item => item.name),
    )),
  ]),
) as Record<EquipmentCategory, string[]>)

const knownPublisherByHost: Record<string, string> = {
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'twitch.tv': 'Twitch',
  'vk.com': 'VK',
  'vkvideo.ru': 'VK Видео',
  't.me': 'Telegram',
  'x.com': 'X / Twitter',
  'twitter.com': 'X / Twitter',
  'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  'discord.gg': 'Discord',
  'boosty.to': 'Boosty',
  'steamcommunity.com': 'Steam',
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'ru', { sensitivity: 'base' }),
  )
}

function urlHost(value: string): string {
  try {
    return new URL(value).hostname.toLocaleLowerCase('en').replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

function suggestedPublisher(url: string): string {
  const host = urlHost(url)
  if (!host)
    return ''

  for (const [knownHost, publisher] of Object.entries(knownPublisherByHost)) {
    if (host === knownHost || host.endsWith(`.${knownHost}`))
      return publisher
  }

  return records.value
    .flatMap(record => record.document.sources)
    .find(source => urlHost(source.url) === host)
    ?.publisher || ''
}

function nextSourceId(url: string, sourceIndex: number): string {
  const host = urlHost(url)
  const base = (host.split('.')[0] || 'source')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '') || 'source'
  const used = new Set(
    editor.value?.sources
      .filter((_, index) => index !== sourceIndex)
      .map(source => source.id) || [],
  )

  if (!used.has(base))
    return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`))
    suffix++
  return `${base}-${suffix}`
}

function completeSource(source: Creator['sources'][number], sourceIndex: number) {
  const publisher = suggestedPublisher(source.url)
  if (!source.publisher && publisher)
    source.publisher = publisher
  if (!source.id && urlHost(source.url))
    source.id = nextSourceId(source.url, sourceIndex)
}

function completeSocial(social: NonNullable<Creator['socials']>[number]) {
  if (!social.label)
    social.label = suggestedPublisher(social.url)
}

function emptyCreator(): Creator {
  const today = new Date().toISOString().slice(0, 10)
  return {
    slug: '',
    name: '',
    realName: { en: '', ru: '' },
    aliases: [],
    initials: '',
    accent: creatorAccent(''),
    kinds: ['streamer'],
    platforms: ['twitch'],
    featured: false,
    indexable: false,
    verificationStatus: 'research',
    publishedAt: today,
    updatedAt: today,
    content: {
      en: {
        seoTitle: '',
        seoDescription: '',
        eyebrow: '',
        intro: '',
        verdict: '',
        researchNote: '',
      },
      ru: {
        seoTitle: '',
        seoDescription: '',
        eyebrow: '',
        intro: '',
        verdict: '',
        researchNote: '',
      },
    },
    equipment: [],
    sources: [],
    socials: [],
  }
}

function cloneCreator(document: Creator): Creator {
  return JSON.parse(JSON.stringify(document)) as Creator
}

function normalizeEditor(document: Creator): Creator {
  const copy = cloneCreator(document)
  copy.realName ||= { en: '', ru: '' }
  copy.socials ||= []
  for (const item of copy.equipment) {
    item.note ||= { en: '', ru: '' }
    item.affiliateUrl ||= {}
  }
  return copy
}

function messageFromError(value: unknown): string {
  const candidate = value as {
    data?: {
      statusMessage?: string
      message?: string
      data?: { problems?: string[] }
    }
    message?: string
  }
  const problems = candidate?.data?.data?.problems
  return problems?.length
    ? problems.join('\n')
    : candidate?.data?.statusMessage || candidate?.data?.message || candidate?.message || 'Неизвестная ошибка'
}

function statusFromError(value: unknown): number | undefined {
  const candidate = value as {
    status?: number
    statusCode?: number
    response?: { status?: number }
    data?: { statusCode?: number }
    cause?: {
      status?: number
      statusCode?: number
      response?: { status?: number }
      data?: { statusCode?: number }
    }
  }

  return candidate?.statusCode
    || candidate?.status
    || candidate?.response?.status
    || candidate?.data?.statusCode
    || candidate?.cause?.statusCode
    || candidate?.cause?.status
    || candidate?.cause?.response?.status
    || candidate?.cause?.data?.statusCode
}

async function handleExpiredSession(value: unknown): Promise<boolean> {
  if (statusFromError(value) !== 401)
    return false

  sessionExpired.value = true
  notice.value = ''
  error.value = ''
  authError.value = 'Сессия истекла. Войдите снова — несохранённые изменения останутся в форме.'
  status.value.authenticated = false

  await Promise.allSettled([
    fetchSession(),
    refreshStatus(),
  ])
  status.value.authenticated = false
  return true
}

async function completeAuthentication(action: 'register' | 'authenticate') {
  authPending.value = true
  authError.value = ''

  try {
    if (action === 'register') {
      await register({
        userName: 'setupindex-admin',
        displayName: 'SetupIndex administrator',
      })
    }
    else {
      await authenticate('setupindex-admin')
    }

    await fetchSession()
    await refreshStatus()
    if (status.value.authenticated)
      await loadAuthenticatedWorkspace()
  }
  catch (value) {
    authError.value = messageFromError(value)
    await refreshStatus()
  }
  finally {
    authPending.value = false
  }
}

async function devLogin() {
  authPending.value = true
  authError.value = ''

  try {
    await requestFetch('/api/admin/dev-login', { method: 'POST' })
    await fetchSession()
    await refreshStatus()
    await loadAuthenticatedWorkspace()
  }
  catch (value) {
    authError.value = messageFromError(value)
  }
  finally {
    authPending.value = false
  }
}

async function logout() {
  try {
    await requestFetch('/api/admin/logout', { method: 'POST' })
  }
  catch (value) {
    if (await handleExpiredSession(value))
      return
    error.value = messageFromError(value)
    return
  }

  editor.value = null
  records.value = []
  tab.value = 'creators'
  sessionExpired.value = false
  await fetchSession()
  await refreshStatus()
}

async function loadCreators(selectSlug?: string) {
  records.value = await requestFetch<StoredCreator[]>('/api/admin/creators')

  if (selectSlug) {
    const record = records.value.find(item => item.document.slug === selectSlug)
    if (record)
      openCreator(record)
  }
}

function openCreator(record: StoredCreator) {
  editor.value = normalizeEditor(record.document)
  editorVersion.value = record.version
  originalSlug.value = record.document.slug
  notice.value = ''
  error.value = ''
  tab.value = 'content'
}

function openNewCreator() {
  editor.value = emptyCreator()
  editorVersion.value = null
  originalSlug.value = ''
  notice.value = ''
  error.value = ''
  tab.value = 'content'
}

async function loadWorkspace() {
  if (props.creatorSlug === 'new') {
    await loadCreators()
    openNewCreator()
    return
  }

  await loadCreators(props.creatorSlug)
  if (props.creatorSlug && !editor.value) {
    tab.value = 'content'
    error.value = `Стример «${props.creatorSlug}» не найден.`
  }
}

async function loadAuthenticatedWorkspace() {
  try {
    if (sessionExpired.value && editor.value)
      await loadCreators()
    else
      await loadWorkspace()
    sessionExpired.value = false
  }
  catch (value) {
    if (!(await handleExpiredSession(value)))
      error.value = messageFromError(value)
  }
}

function creatorEditorPath(slug: string): string {
  return localePath(`/admin/creators/${encodeURIComponent(slug)}`)
}

async function editCreator(record: StoredCreator) {
  await navigateTo(creatorEditorPath(record.document.slug))
}

async function createCreator() {
  await navigateTo(creatorEditorPath('new'))
}

async function showCreatorTable() {
  editor.value = null
  originalSlug.value = ''
  notice.value = ''
  error.value = ''
  tab.value = 'creators'
  await navigateTo(localePath('/admin'))
}

async function showImport() {
  editor.value = null
  tab.value = 'import'

  if (props.creatorSlug !== undefined)
    await navigateTo(`${localePath('/admin')}?view=import`)
}

function updateCsv(field: 'aliases', value: string) {
  if (!editor.value)
    return
  editor.value[field] = value.split(',').map(item => item.trim()).filter(Boolean)
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  const index = values.indexOf(value)
  if (index === -1)
    values.push(value)
  else
    values.splice(index, 1)
}

function toggleSourceId(sourceIds: string[], sourceId: string) {
  if (sourceId)
    toggleArrayValue(sourceIds, sourceId)
}

function updateSourceId(sourceIndex: number, nextId: string) {
  if (!editor.value)
    return

  const source = editor.value.sources[sourceIndex]
  if (!source)
    return

  const previousId = source.id
  source.id = nextId
  if (!previousId || previousId === nextId)
    return

  for (const item of editor.value.equipment) {
    item.sourceIds = item.sourceIds.map(id => id === previousId ? nextId : id)
  }
}

function addEquipment() {
  editor.value?.equipment.push({
    category: 'cpu',
    name: '',
    status: 'reported',
    sourceIds: [],
    note: { en: '', ru: '' },
    affiliateUrl: {},
  })
}

function addSource() {
  editor.value?.sources.push({
    id: '',
    title: { en: '', ru: '' },
    publisher: '',
    url: 'https://',
    checkedAt: new Date().toISOString().slice(0, 10),
  })
}

function addSocial() {
  editor.value?.socials?.push({
    label: '',
    url: 'https://',
  })
}

function cleanCreatorForSave(value: Creator): Creator {
  const copy = cloneCreator(value)
  copy.accent = creatorAccent(copy.slug)
  if (!copy.realName?.en && !copy.realName?.ru)
    delete copy.realName
  if (!copy.game)
    delete copy.game

  for (const source of copy.sources) {
    if (!source.sourceUpdatedAt)
      delete source.sourceUpdatedAt
  }

  for (const item of copy.equipment) {
    if (!item.note?.en && !item.note?.ru)
      delete item.note
    if (item.affiliateUrl) {
      if (!item.affiliateUrl.en)
        delete item.affiliateUrl.en
      if (!item.affiliateUrl.ru)
        delete item.affiliateUrl.ru
      if (!Object.keys(item.affiliateUrl).length)
        delete item.affiliateUrl
    }
  }
  return copy
}

async function saveCreator() {
  if (!editor.value)
    return

  savePending.value = true
  notice.value = ''
  error.value = ''

  try {
    const document = cleanCreatorForSave(editor.value)
    const saved = editorVersion.value === null
      ? await requestFetch<StoredCreator>('/api/admin/creators', {
          method: 'POST',
          body: document,
        })
      : await requestFetch<StoredCreator>(`/api/admin/creators/${encodeURIComponent(originalSlug.value)}`, {
          method: 'PUT',
          body: {
            expectedVersion: editorVersion.value,
            document,
          },
        })

    if (props.creatorSlug !== saved.document.slug) {
      await navigateTo(creatorEditorPath(saved.document.slug), {
        replace: true,
      })
    }
    await loadCreators(saved.document.slug)
    notice.value = 'Изменения опубликованы.'
  }
  catch (value) {
    if (!(await handleExpiredSession(value)))
      error.value = messageFromError(value)
  }
  finally {
    savePending.value = false
  }
}

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function creatorForExport(document: Creator): Omit<Creator, 'accent'> {
  const { accent: _accent, ...automaticDocument } = document
  return automaticDocument
}

function exportAll() {
  downloadJson('setupindex-creators.json', {
    format: 'setupindex.creator-batch',
    version: 1,
    operations: records.value.map(record => ({
      action: 'update',
      slug: record.document.slug,
      expectedVersion: record.version,
      document: creatorForExport(record.document),
    })),
  })
}

function exportCreateTemplate() {
  downloadJson('setupindex-create-example.json', {
    format: 'setupindex.creator-batch',
    version: 1,
    operations: [{
      action: 'create',
      document: creatorForExport(emptyCreator()),
    }],
  })
}

function parseImportText() {
  importPreview.value = undefined
  importBatch.value = JSON.parse(importText.value) as Record<string, unknown>
}

async function selectImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  importText.value = await file.text()
  try {
    parseImportText()
    error.value = ''
  }
  catch (value) {
    error.value = `Некорректный JSON: ${messageFromError(value)}`
  }
}

async function previewBatch() {
  importPending.value = true
  error.value = ''
  notice.value = ''

  try {
    parseImportText()
    importPreview.value = await requestFetch<ImportPreview>('/api/admin/import/preview', {
      method: 'POST',
      body: importBatch.value,
    })
  }
  catch (value) {
    importPreview.value = undefined
    if (!(await handleExpiredSession(value)))
      error.value = messageFromError(value)
  }
  finally {
    importPending.value = false
  }
}

async function applyBatch() {
  if (!importPreview.value?.valid || !importPreview.value.signature)
    return

  importPending.value = true
  error.value = ''

  try {
    const result = await requestFetch<{ applied: number }>('/api/admin/import/apply', {
      method: 'POST',
      body: {
        batch: importBatch.value,
        signature: importPreview.value.signature,
      },
    })
    notice.value = `Импорт применён: ${result.applied} операций.`
    importPreview.value = undefined
    await loadCreators()
  }
  catch (value) {
    if (!(await handleExpiredSession(value)))
      error.value = messageFromError(value)
  }
  finally {
    importPending.value = false
  }
}

if (status.value.authenticated)
  await loadAuthenticatedWorkspace()
</script>

<template>
  <div class="admin-page">
    <header class="admin-header">
      <NuxtLink :to="localePath('/')" class="admin-brand">SetupIndex</NuxtLink>
      <div v-if="status.authenticated" class="admin-header-actions">
        <span>Администратор</span>
        <button type="button" class="admin-button secondary" @click="logout">
          Выйти
        </button>
      </div>
    </header>

    <main v-if="!status.authenticated" class="admin-auth">
      <section class="admin-auth-card">
        <p class="admin-kicker">ADMIN / PASSKEY</p>
        <h1>{{ status.configured ? 'Вход в админ-панель' : 'Создание администратора' }}</h1>
        <p v-if="status.configured">
          Используйте passkey, зарегистрированный для SetupIndex.
        </p>
        <p v-else>
          Администратор ещё не создан. Первый успешно зарегистрированный passkey станет единственным ключом администратора.
        </p>

        <p v-if="!webAuthnSupported" class="admin-alert error">
          Этот браузер не поддерживает WebAuthn.
        </p>
        <p v-if="authError" class="admin-alert error">{{ authError }}</p>

        <button
          type="button"
          class="admin-button primary wide"
          :disabled="authPending || !webAuthnSupported"
          @click="completeAuthentication(status.configured ? 'authenticate' : 'register')"
        >
          {{ authPending ? 'Подождите…' : status.configured ? 'Войти с passkey' : 'Создать passkey' }}
        </button>

        <template v-if="status.devMode">
          <div class="admin-auth-divider"><span>DEV</span></div>
          <button
            type="button"
            class="admin-button secondary wide"
            :disabled="authPending"
            @click="devLogin"
          >
            Войти без WebAuthn
          </button>
        </template>
      </section>
    </main>

    <div v-else class="admin-workspace">
      <aside class="admin-sidebar">
        <button type="button" class="admin-button primary wide" @click="createCreator">
          + Новый стример
        </button>
        <button
          type="button"
          :class="['admin-nav-button', { active: tab === 'creators' }]"
          @click="showCreatorTable"
        >
          Стримеры ({{ records.length }})
        </button>
        <button
          type="button"
          :class="['admin-nav-button', { active: tab === 'import' }]"
          @click="showImport"
        >
          Импорт и экспорт
        </button>
      </aside>

      <section class="admin-main">
        <p v-if="notice" class="admin-alert success">{{ notice }}</p>
        <pre v-if="error" class="admin-alert error">{{ error }}</pre>

        <div v-if="tab === 'creators'" class="admin-panel creators-panel">
          <div class="admin-title-row">
            <div>
              <p class="admin-kicker">CREATORS</p>
              <h1>Стримеры</h1>
              <p class="admin-table-summary">
                Показано {{ filteredRecords.length }} из {{ records.length }}
              </p>
            </div>
            <label class="admin-table-search">
              <span class="sr-only">Поиск стримера</span>
              <input
                v-model="creatorSearch"
                type="search"
                placeholder="Имя, slug, игра или платформа"
              >
            </label>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-creators-table">
              <thead>
                <tr>
                  <th>Стример</th>
                  <th>Тип / платформы</th>
                  <th>Сборка</th>
                  <th>Публикация</th>
                  <th>Обновлено</th>
                  <th>Версия</th>
                  <th><span class="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredRecords" :key="record.document.slug">
                  <td>
                    <button type="button" class="admin-creator-name" @click="editCreator(record)">
                      {{ record.document.name }}
                    </button>
                    <span class="admin-creator-slug">{{ record.document.slug }}</span>
                  </td>
                  <td>
                    <strong class="admin-cell-primary">{{ record.document.kinds.join(', ') }}</strong>
                    <span class="admin-cell-secondary">{{ record.document.platforms.join(', ') }}</span>
                  </td>
                  <td>
                    <strong class="admin-cell-primary">{{ record.document.equipment.length }}</strong>
                    <span class="admin-cell-secondary">позиций</span>
                  </td>
                  <td>
                    <span :class="['admin-status-badge', record.document.indexable ? 'published' : 'draft']">
                      {{ record.document.indexable ? 'В индексе' : 'Черновик' }}
                    </span>
                    <span v-if="record.document.featured" class="admin-cell-secondary">На главной</span>
                  </td>
                  <td>
                    <strong class="admin-cell-primary">{{ record.document.updatedAt }}</strong>
                    <span v-if="record.document.game" class="admin-cell-secondary">{{ record.document.game }}</span>
                  </td>
                  <td class="admin-version">v{{ record.version }}</td>
                  <td>
                    <button type="button" class="admin-edit-button" @click="editCreator(record)">
                      Править
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredRecords.length">
                  <td colspan="7" class="admin-table-empty">
                    {{ records.length ? 'По вашему запросу ничего не найдено.' : 'Стримеров пока нет.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="tab === 'import'" class="admin-panel import-panel">
          <div class="admin-title-row">
            <div>
              <p class="admin-kicker">BULK JSON</p>
              <h1>Импорт и экспорт</h1>
            </div>
            <div class="admin-inline-actions">
              <a class="admin-button secondary" href="/api/admin/import/schema" download>
                JSON Schema
              </a>
              <button type="button" class="admin-button secondary" @click="exportCreateTemplate">
                Шаблон создания
              </button>
              <button type="button" class="admin-button secondary" @click="exportAll">
                Экспортировать всех
              </button>
            </div>
          </div>

          <p class="admin-help">
            Передайте нейросети JSON Schema и экспорт. После загрузки файл сначала проверяется и показывает изменения. Ничего не сохраняется до нажатия «Применить».
          </p>

          <label class="admin-file">
            <span>Выбрать JSON-файл</span>
            <input type="file" accept=".json,application/json" @change="selectImportFile">
          </label>
          <label class="admin-field">
            <span>Содержимое импорта</span>
            <textarea v-model="importText" rows="18" spellcheck="false" placeholder="{ ... }" />
          </label>

          <button type="button" class="admin-button primary" :disabled="importPending || !importText" @click="previewBatch">
            {{ importPending ? 'Проверяю…' : 'Проверить и показать изменения' }}
          </button>

          <div v-if="importPreview" class="import-preview">
            <h2>{{ importPreview.valid ? 'Файл готов к применению' : 'Найдены ошибки' }}</h2>
            <article v-for="item in importPreview.items" :key="`${item.action}-${item.slug}`" :class="{ invalid: !item.valid }">
              <div>
                <strong>{{ item.action === 'create' ? 'Создание' : 'Обновление' }}: {{ item.slug }}</strong>
                <p>Поля: {{ item.changedFields.join(', ') || 'без изменений' }}</p>
              </div>
              <div>
                <span>Оборудование: {{ item.equipmentBefore }} → {{ item.equipmentAfter }}</span>
                <span>Источники: {{ item.sourcesBefore }} → {{ item.sourcesAfter }}</span>
              </div>
              <ul v-if="item.problems.length">
                <li v-for="problem in item.problems" :key="problem">{{ problem }}</li>
              </ul>
            </article>

            <button
              v-if="importPreview.valid"
              type="button"
              class="admin-button danger"
              :disabled="importPending"
              @click="applyBatch"
            >
              Применить {{ importPreview.items.length }} операций
            </button>
          </div>
        </div>

        <div v-else-if="editor" class="admin-panel">
          <div class="admin-title-row sticky">
            <div>
              <p class="admin-kicker">{{ editorVersion === null ? 'NEW CREATOR' : `VERSION ${editorVersion}` }}</p>
              <h1>{{ editor.name || 'Новый стример' }}</h1>
            </div>
            <button type="button" class="admin-button primary" :disabled="savePending" @click="saveCreator">
              {{ savePending ? 'Сохраняю…' : 'Сохранить и опубликовать' }}
            </button>
          </div>

          <section class="admin-form-section">
            <h2>Основное</h2>
            <div class="admin-form-grid">
              <label class="admin-field"><span>Имя</span><input v-model="editor.name"></label>
              <label class="admin-field"><span>Slug</span><input v-model="editor.slug" pattern="[a-z0-9-]+"></label>
              <label class="admin-field"><span>Инициалы</span><input v-model="editor.initials"></label>
              <div class="admin-field">
                <span>Цвет</span>
                <div class="admin-auto-accent">
                  <i :style="{ background: editor.accent }" />
                  <code>{{ editor.accent }}</code>
                  <small>автоматически из slug</small>
                </div>
              </div>
              <label class="admin-field">
                <span>Игра</span>
                <input v-model="editor.game" list="admin-game-suggestions" autocomplete="off">
              </label>
              <label class="admin-field">
                <span>Статус проверки</span>
                <select v-model="editor.verificationStatus">
                  <option v-for="value in verificationStatuses" :key="value" :value="value">{{ value }}</option>
                </select>
              </label>
              <label class="admin-field"><span>Дата публикации</span><input v-model="editor.publishedAt" type="date"></label>
              <label class="admin-field"><span>Дата обновления</span><input v-model="editor.updatedAt" type="date"></label>
              <label class="admin-field"><span>Настоящее имя EN</span><input v-model="editor.realName!.en"></label>
              <label class="admin-field"><span>Настоящее имя RU</span><input v-model="editor.realName!.ru"></label>
              <label class="admin-field full">
                <span>Алиасы через запятую</span>
                <input :value="editor.aliases.join(', ')" @input="updateCsv('aliases', ($event.target as HTMLInputElement).value)">
              </label>
            </div>

            <div class="admin-check-groups">
              <fieldset>
                <legend>Тип</legend>
                <label v-for="kind in creatorKinds" :key="kind">
                  <input type="checkbox" :checked="editor.kinds.includes(kind)" @change="toggleArrayValue(editor.kinds, kind)">
                  {{ kind }}
                </label>
              </fieldset>
              <fieldset>
                <legend>Платформы</legend>
                <label v-for="platform in platforms" :key="platform">
                  <input type="checkbox" :checked="editor.platforms.includes(platform)" @change="toggleArrayValue(editor.platforms, platform)">
                  {{ platform }}
                </label>
              </fieldset>
              <fieldset>
                <legend>Публикация</legend>
                <label><input v-model="editor.featured" type="checkbox"> На главной</label>
                <label><input v-model="editor.indexable" type="checkbox"> Индексировать</label>
              </fieldset>
            </div>
          </section>

          <section v-for="locale in (['ru', 'en'] as const)" :key="locale" class="admin-form-section">
            <h2>Контент {{ locale.toUpperCase() }}</h2>
            <div class="admin-form-grid">
              <label class="admin-field full">
                <span>SEO title ({{ editor.content[locale].seoTitle.length }}/70)</span>
                <input v-model="editor.content[locale].seoTitle">
              </label>
              <label class="admin-field full">
                <span>SEO description ({{ editor.content[locale].seoDescription.length }}/165)</span>
                <textarea v-model="editor.content[locale].seoDescription" rows="2" />
              </label>
              <label class="admin-field full"><span>Eyebrow</span><input v-model="editor.content[locale].eyebrow"></label>
              <label class="admin-field full"><span>Вступление</span><textarea v-model="editor.content[locale].intro" rows="4" /></label>
              <label class="admin-field full"><span>Вердикт</span><textarea v-model="editor.content[locale].verdict" rows="4" /></label>
              <label class="admin-field full"><span>Research note</span><textarea v-model="editor.content[locale].researchNote" rows="2" /></label>
            </div>
          </section>

          <section class="admin-form-section">
            <div class="admin-section-title">
              <h2>Сборка и оборудование</h2>
              <button type="button" class="admin-button secondary" @click="addEquipment">+ Позиция</button>
            </div>
            <div class="admin-repeat-list">
              <article v-for="(item, index) in editor.equipment" :key="index" class="admin-repeat-card">
                <div class="admin-form-grid equipment-row">
                  <label class="admin-field">
                    <span>Категория</span>
                    <select v-model="item.category">
                      <option v-for="category in equipmentCategories" :key="category" :value="category">{{ category }}</option>
                    </select>
                  </label>
                  <label class="admin-field">
                    <span>Модель</span>
                    <input
                      v-model="item.name"
                      :list="`admin-equipment-${item.category}-suggestions`"
                      autocomplete="off"
                    >
                  </label>
                  <label class="admin-field">
                    <span>Статус</span>
                    <select v-model="item.status">
                      <option v-for="value in equipmentStatuses" :key="value" :value="value">{{ value }}</option>
                    </select>
                  </label>
                  <div class="admin-field full">
                    <span>Источники</span>
                    <div v-if="editor.sources.length" class="admin-source-picker">
                      <label
                        v-for="(source, sourceIndex) in editor.sources"
                        :key="sourceIndex"
                        :class="{ disabled: !source.id }"
                      >
                        <input
                          type="checkbox"
                          :checked="Boolean(source.id && item.sourceIds.includes(source.id))"
                          :disabled="!source.id"
                          @change="toggleSourceId(item.sourceIds, source.id)"
                        >
                        <span>
                          <strong>{{ source.id || 'Сначала укажите ID' }}</strong>
                          <small>{{ source.publisher || urlHost(source.url) || `Источник ${sourceIndex + 1}` }}</small>
                        </span>
                      </label>
                    </div>
                    <small v-else class="admin-input-hint">
                      Сначала добавьте источник в разделе ниже.
                    </small>
                  </div>
                  <label class="admin-field full"><span>Примечание RU</span><input v-model="item.note!.ru"></label>
                  <label class="admin-field full"><span>Примечание EN</span><input v-model="item.note!.en"></label>
                  <label class="admin-field"><span>Партнёрская ссылка RU</span><input v-model="item.affiliateUrl!.ru" type="url"></label>
                  <label class="admin-field"><span>Партнёрская ссылка EN</span><input v-model="item.affiliateUrl!.en" type="url"></label>
                </div>
                <button type="button" class="admin-remove" @click="editor.equipment.splice(index, 1)">Удалить</button>
              </article>
            </div>
          </section>

          <section class="admin-form-section">
            <div class="admin-section-title">
              <h2>Источники</h2>
              <button type="button" class="admin-button secondary" @click="addSource">+ Источник</button>
            </div>
            <div class="admin-repeat-list">
              <article v-for="(source, index) in editor.sources" :key="index" class="admin-repeat-card">
                <div class="admin-form-grid">
                  <label class="admin-field">
                    <span>ID</span>
                    <input
                      :value="source.id"
                      placeholder="заполнится из URL"
                      @input="updateSourceId(index, ($event.target as HTMLInputElement).value)"
                    >
                    <small class="admin-input-hint">При переименовании связи в сборке обновятся автоматически.</small>
                  </label>
                  <label class="admin-field">
                    <span>Издатель</span>
                    <input
                      v-model="source.publisher"
                      list="admin-publisher-suggestions"
                      autocomplete="off"
                      placeholder="например, YouTube"
                    >
                  </label>
                  <label class="admin-field full">
                    <span>URL</span>
                    <input
                      v-model="source.url"
                      type="url"
                      placeholder="https://"
                      @blur="completeSource(source, index)"
                    >
                    <small v-if="suggestedPublisher(source.url)" class="admin-input-hint">
                      Домен распознан: {{ suggestedPublisher(source.url) }}
                    </small>
                  </label>
                  <label class="admin-field"><span>Название RU</span><input v-model="source.title.ru"></label>
                  <label class="admin-field"><span>Название EN</span><input v-model="source.title.en"></label>
                  <label class="admin-field"><span>Проверено</span><input v-model="source.checkedAt" type="date"></label>
                  <label class="admin-field"><span>Дата источника</span><input v-model="source.sourceUpdatedAt" type="date"></label>
                </div>
                <button type="button" class="admin-remove" @click="editor.sources.splice(index, 1)">Удалить</button>
              </article>
            </div>
          </section>

          <section class="admin-form-section">
            <div class="admin-section-title">
              <h2>Социальные ссылки</h2>
              <button type="button" class="admin-button secondary" @click="addSocial">+ Ссылка</button>
            </div>
            <div class="admin-repeat-list">
              <article v-for="(social, index) in editor.socials" :key="index" class="admin-repeat-card compact">
                <label class="admin-field">
                  <span>Название</span>
                  <input
                    v-model="social.label"
                    list="admin-social-label-suggestions"
                    autocomplete="off"
                  >
                </label>
                <label class="admin-field">
                  <span>URL</span>
                  <input
                    v-model="social.url"
                    type="url"
                    placeholder="https://"
                    @blur="completeSocial(social)"
                  >
                </label>
                <button type="button" class="admin-remove" @click="editor.socials?.splice(index, 1)">Удалить</button>
              </article>
            </div>
          </section>
        </div>

        <div v-else class="admin-empty">
          <h1>Выберите стримера</h1>
          <p>Или создайте новую карточку.</p>
        </div>
      </section>
    </div>

    <datalist id="admin-game-suggestions">
      <option v-for="game in gameSuggestions" :key="game" :value="game" />
    </datalist>
    <datalist id="admin-publisher-suggestions">
      <option v-for="publisher in publisherSuggestions" :key="publisher" :value="publisher" />
    </datalist>
    <datalist id="admin-social-label-suggestions">
      <option v-for="label in socialLabelSuggestions" :key="label" :value="label" />
    </datalist>
    <datalist
      v-for="category in equipmentCategories"
      :id="`admin-equipment-${category}-suggestions`"
      :key="category"
    >
      <option
        v-for="name in equipmentSuggestionsByCategory[category]"
        :key="name"
        :value="name"
      />
    </datalist>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  color: #e9edf2;
  background: #090b0e;
  font-family: Inter, system-ui, sans-serif;
}

.admin-header {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid #252b33;
  background: rgb(9 11 14 / 92%);
  backdrop-filter: blur(16px);
}

.admin-brand {
  color: #d9ff58;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -.04em;
}

.admin-header-actions,
.admin-inline-actions,
.admin-section-title,
.admin-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-header-actions span {
  color: #89939f;
  font-size: 13px;
}

.admin-auth {
  display: grid;
  min-height: calc(100vh - 64px);
  padding: 24px;
  place-items: center;
}

.admin-auth-card {
  width: min(100%, 520px);
  padding: 40px;
  border: 1px solid #2c343d;
  border-radius: 20px;
  background: #11151a;
  box-shadow: 0 24px 80px rgb(0 0 0 / 35%);
}

.admin-auth-card h1,
.admin-title-row h1,
.admin-empty h1 {
  margin: 6px 0 14px;
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1;
}

.admin-auth-card > p:not(.admin-kicker, .admin-alert),
.admin-help,
.admin-empty p {
  color: #9aa4af;
  line-height: 1.6;
}

.admin-kicker {
  margin: 0;
  color: #d9ff58;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .12em;
}

.admin-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: calc(100vh - 64px);
}

.admin-sidebar {
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  padding: 20px;
  overflow: auto;
  border-right: 1px solid #252b33;
  background: #0d1014;
}

.admin-nav-button {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 10px;
  color: #c9d0d8;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.admin-nav-button {
  margin-top: 8px;
}

.admin-nav-button:hover,
.admin-nav-button.active {
  color: #fff;
  background: #20262d;
}

.admin-main {
  min-width: 0;
  padding: 28px;
}

.admin-panel {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.admin-title-row {
  align-items: flex-end;
  margin-bottom: 26px;
}

.admin-title-row.sticky {
  position: sticky;
  z-index: 10;
  top: 76px;
  padding: 14px 0;
  background: #090b0e;
}

.admin-table-summary {
  margin: -6px 0 0;
  color: #7d8792;
  font-size: 13px;
}

.admin-table-search {
  width: min(100%, 340px);
}

.admin-table-search input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #333d47;
  border-radius: 10px;
  outline: 0;
  color: #f1f4f7;
  background: #0a0d11;
  font: inherit;
}

.admin-table-search input:focus {
  border-color: #a9c941;
  box-shadow: 0 0 0 3px rgb(217 255 88 / 8%);
}

.admin-table-wrap {
  overflow-x: auto;
  border: 1px solid #252c34;
  border-radius: 15px;
  background: #101419;
}

.admin-creators-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.admin-creators-table th,
.admin-creators-table td {
  padding: 15px 16px;
  border-bottom: 1px solid #252c34;
  text-align: left;
  vertical-align: middle;
}

.admin-creators-table th {
  color: #7f8a95;
  background: #0d1115;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.admin-creators-table tbody tr {
  transition: background .15s ease;
}

.admin-creators-table tbody tr:hover {
  background: #141a20;
}

.admin-creators-table tbody tr:last-child td {
  border-bottom: 0;
}

.admin-creator-name,
.admin-edit-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

.admin-creator-name {
  display: block;
  color: #f0f4f7;
  font-weight: 800;
  text-align: left;
}

.admin-creator-name:hover,
.admin-edit-button:hover {
  color: #d9ff58;
}

.admin-creator-slug,
.admin-cell-secondary {
  display: block;
  margin-top: 4px;
  color: #7d8792;
  font-size: 12px;
}

.admin-creator-slug,
.admin-version {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.admin-cell-primary {
  color: #cdd4dc;
  font-size: 13px;
  font-weight: 600;
}

.admin-status-badge {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.admin-status-badge.published {
  color: #c9f1b7;
  background: #1b3020;
}

.admin-status-badge.draft {
  color: #c8d0d8;
  background: #29313a;
}

.admin-version {
  color: #89949f;
  font-size: 12px;
}

.admin-edit-button {
  color: #b8c3ce;
  font-size: 13px;
  font-weight: 700;
}

.admin-table-empty {
  height: 160px;
  color: #7d8792;
  text-align: center !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.admin-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.admin-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.admin-button.primary {
  color: #0a0c0f;
  background: #d9ff58;
}

.admin-button.secondary {
  border-color: #343d47;
  color: #dfe5eb;
  background: #171c22;
}

.admin-button.danger {
  color: #fff;
  background: #b53a45;
}

.admin-button.wide {
  width: 100%;
}

.admin-auth-card .admin-button {
  margin-top: 18px;
}

.admin-auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: #68737e;
  font: 700 11px ui-monospace, SFMono-Regular, Consolas, monospace;
}

.admin-auth-divider::before,
.admin-auth-divider::after {
  height: 1px;
  flex: 1;
  background: #2b333c;
  content: "";
}

.admin-alert {
  width: min(100%, 1120px);
  margin: 0 auto 18px;
  padding: 12px 15px;
  border-radius: 9px;
  white-space: pre-wrap;
}

.admin-alert.error {
  border: 1px solid #6e333a;
  color: #ffb5bc;
  background: #2a1519;
}

.admin-alert.success {
  border: 1px solid #3e6135;
  color: #c9f1b7;
  background: #172315;
}

.admin-form-section {
  margin-bottom: 22px;
  padding: 24px;
  border: 1px solid #252c34;
  border-radius: 15px;
  background: #101419;
}

.admin-form-section h2,
.import-preview h2 {
  margin: 0 0 20px;
  font-size: 19px;
}

.admin-section-title h2 {
  margin: 0;
}

.admin-section-title {
  margin-bottom: 20px;
}

.admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.admin-field {
  display: grid;
  min-width: 0;
  gap: 7px;
  color: #909ba6;
  font-size: 12px;
  font-weight: 700;
}

.admin-field.full {
  grid-column: 1 / -1;
}

.admin-field input,
.admin-field select,
.admin-field textarea {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid #333d47;
  border-radius: 8px;
  outline: 0;
  color: #f1f4f7;
  background: #0a0d11;
  font: inherit;
  font-size: 14px;
  resize: vertical;
}

.admin-field input:focus,
.admin-field select:focus,
.admin-field textarea:focus {
  border-color: #a9c941;
  box-shadow: 0 0 0 3px rgb(217 255 88 / 8%);
}

.admin-input-hint {
  color: #737e89;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
}

.admin-source-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.admin-source-picker label {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 9px;
  padding: 10px;
  border: 1px solid #333d47;
  border-radius: 8px;
  color: #dfe5eb;
  background: #0a0d11;
  cursor: pointer;
}

.admin-source-picker label:has(input:checked) {
  border-color: #91aa3b;
  background: rgb(217 255 88 / 7%);
}

.admin-source-picker label.disabled {
  cursor: not-allowed;
  opacity: .55;
}

.admin-source-picker input {
  width: auto;
  min-height: auto;
  margin-top: 2px;
}

.admin-source-picker span,
.admin-source-picker strong,
.admin-source-picker small {
  display: block;
  min-width: 0;
}

.admin-source-picker strong {
  overflow: hidden;
  font: 700 12px ui-monospace, SFMono-Regular, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-source-picker small {
  margin-top: 3px;
  overflow: hidden;
  color: #7d8792;
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-auto-accent {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #333d47;
  border-radius: 8px;
  color: #dfe5eb;
  background: #0a0d11;
}

.admin-auto-accent i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: 0 0 14px color-mix(in srgb, currentcolor 45%, transparent);
}

.admin-auto-accent code {
  font-size: 12px;
}

.admin-auto-accent small {
  margin-left: auto;
  color: #737e89;
  font-size: 11px;
}

.admin-check-groups {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.admin-check-groups fieldset {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #2d353e;
  border-radius: 10px;
}

.admin-check-groups legend {
  padding: 0 5px;
  color: #8e99a4;
  font-size: 12px;
  font-weight: 800;
}

.admin-check-groups label {
  font-size: 13px;
}

.admin-repeat-list {
  display: grid;
  gap: 12px;
}

.admin-repeat-card {
  position: relative;
  padding: 16px;
  border: 1px solid #29313a;
  border-radius: 11px;
  background: #0b0e12;
}

.admin-repeat-card.compact {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  align-items: end;
  gap: 12px;
}

.admin-remove {
  margin-top: 12px;
  padding: 0;
  border: 0;
  color: #ef7d87;
  background: none;
  font-size: 12px;
  cursor: pointer;
}

.admin-file {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  padding: 0 16px;
  margin: 18px 0;
  border: 1px dashed #4a5663;
  border-radius: 9px;
  color: #dfe5eb;
  cursor: pointer;
}

.admin-file input {
  max-width: 240px;
  margin-left: 15px;
}

.import-panel > .admin-field {
  margin-bottom: 16px;
}

.import-preview {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}

.import-preview article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 16px;
  border: 1px solid #34402f;
  border-radius: 10px;
  background: #111912;
}

.import-preview article.invalid {
  border-color: #61343a;
  background: #1c1013;
}

.import-preview article p,
.import-preview article span {
  display: block;
  margin: 5px 0 0;
  color: #8f9aa5;
  font-size: 12px;
}

.import-preview article ul {
  grid-column: 1 / -1;
  margin: 0;
  color: #ffb5bc;
  font-size: 13px;
}

.admin-empty {
  display: grid;
  min-height: 60vh;
  text-align: center;
  place-content: center;
}

@media (max-width: 900px) {
  .admin-workspace {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid #252b33;
  }

  .admin-title-row,
  .admin-section-title {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-inline-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-title-row.sticky {
    top: 64px;
  }
}

@media (max-width: 640px) {
  .admin-main,
  .admin-header,
  .admin-auth {
    padding-right: 14px;
    padding-left: 14px;
  }

  .admin-form-section,
  .admin-auth-card {
    padding: 18px;
  }

  .admin-form-grid,
  .admin-check-groups,
  .admin-repeat-card.compact,
  .import-preview article {
    grid-template-columns: 1fr;
  }

  .admin-field.full {
    grid-column: auto;
  }
}
</style>
