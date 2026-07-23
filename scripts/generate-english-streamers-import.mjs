import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const checkedAt = '2026-07-23'
const outputPath = fileURLToPath(
  new URL('../docs/imports/setupindex-english-streamers-20.json', import.meta.url),
)

const researchNoteEn = 'This profile remains noindex until the editorial review is complete.'
const researchNoteRu = 'Профиль закрыт от индексации до завершения редакционной проверки.'

function localeContent(name, eyebrowEn, eyebrowRu, evidence = false, historical = false) {
  const enVerdict = historical
    ? 'The available equipment snapshot is historical and must not be treated as the current setup.'
    : evidence
      ? 'The items below are reported by a dated specialist source and still require editorial review.'
      : 'No current component list has passed source review, so no equipment is presented as fact.'
  const ruVerdict = historical
    ? 'Доступный список оборудования является историческим и не должен считаться актуальным сетапом.'
    : evidence
      ? 'Позиции ниже заявлены датированным профильным источником и ещё проходят редакционную проверку.'
      : 'Актуальный список не прошёл проверку источников, поэтому оборудование не выдаётся за факт.'

  return {
    en: {
      seoTitle: `${name} PC and streaming setup`,
      seoDescription: `Research profile for ${name}'s PC, peripherals and streaming gear. Only dated, source-linked reports are included.`,
      eyebrow: eyebrowEn,
      intro: evidence
        ? `We are reviewing dated public reports about ${name}'s setup. Every listed item links to the report used; third-party data is not presented as creator confirmation.`
        : `We are collecting public evidence for ${name}'s current PC, peripherals and streaming gear. Unverified component lists are deliberately omitted.`,
      verdict: enVerdict,
      researchNote: researchNoteEn,
    },
    ru: {
      seoTitle: `ПК и стриминговый сетап ${name}`,
      seoDescription: `Исследовательский профиль ПК, периферии и стримингового оборудования ${name}. Включаются только датированные сведения со ссылками.`,
      eyebrow: eyebrowRu,
      intro: evidence
        ? `Мы проверяем датированные публикации о сетапе ${name}. Каждая позиция связана с использованным источником, а сторонние данные не выдаются за слова автора.`
        : `Мы собираем публичные подтверждения актуального ПК, периферии и стримингового оборудования ${name}. Непроверенные списки намеренно не публикуются.`,
      verdict: ruVerdict,
      researchNote: researchNoteRu,
    },
  }
}

function source(id, titleEn, titleRu, publisher, url, sourceUpdatedAt) {
  return {
    id,
    title: { en: titleEn, ru: titleRu },
    publisher,
    url,
    ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}),
    checkedAt,
  }
}

function equipment(category, name, sourceIds, status = 'reported', note) {
  return {
    category,
    name,
    status,
    sourceIds,
    ...(note ? { note } : {}),
  }
}

function profile({
  slug,
  name,
  realName,
  aliases,
  initials,
  kinds,
  platforms,
  game,
  eyebrowEn,
  eyebrowRu,
  socials,
  equipment: items = [],
  sources = [],
  historical = false,
}) {
  return {
    slug,
    name,
    ...(realName ? { realName } : {}),
    aliases,
    initials,
    kinds,
    platforms,
    game,
    featured: false,
    indexable: false,
    verificationStatus: 'research',
    publishedAt: checkedAt,
    updatedAt: checkedAt,
    content: localeContent(name, eyebrowEn, eyebrowRu, items.length > 0, historical),
    equipment: items,
    sources,
    socials,
  }
}

const prosettingsJynxzi = 'prosettings-jynxzi-2026'
const prosettingsXqc = 'prosettings-xqc-2023'
const prosettingsTypicalGamer = 'prosettings-typical-gamer-2026'
const prosettingsShroud = 'prosettings-shroud-2026'
const prosettingsNinja = 'prosettings-ninja-2025'
const prosettingsClix = 'prosettings-clix-2026'
const clixTour = 'clix-penthouse-tour-2026'
const prosettingsTenz = 'prosettings-tenz-2026'
const prosettingsTarik = 'prosettings-tarik-2025'
const prosettingsTim = 'prosettings-timthetatman-2025'

const historicalXqcNote = {
  en: 'The source snapshot is dated August 2023 and is retained only as historical context.',
  ru: 'Снимок источника датирован августом 2023 года и сохранён только как исторический контекст.',
}

const clixTourNote = {
  en: 'Visible in Clix’s January 2026 apartment tour; the exact model is cross-checked against ProSettings.',
  ru: 'Устройство видно в туре Clix по квартире за январь 2026 года; точная модель сверена с ProSettings.',
}

const documents = [
  profile({
    slug: 'theburntpeanut',
    name: 'TheBurntPeanut',
    aliases: ['the burnt peanut', 'burntpeanut', 'tbp'],
    initials: 'TBP',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'ARC Raiders and variety',
    eyebrowEn: 'English-language VTuber and variety streamer',
    eyebrowRu: 'Англоязычный VTuber и variety-стример',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/theburntpeanut' },
      { label: 'YouTube', url: 'https://www.youtube.com/@theburntpeanut' },
    ],
  }),
  profile({
    slug: 'jynxzi',
    name: 'Jynxzi',
    realName: { en: 'Nicholas Stewart', ru: 'Николас Стюарт' },
    aliases: ['junko', 'nicholas stewart', 'jynxzi r6'],
    initials: 'JX',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Rainbow Six Siege',
    eyebrowEn: 'Rainbow Six Siege streamer',
    eyebrowRu: 'Стример по Rainbow Six Siege',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/jynxzi' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Jynxzi' },
    ],
    equipment: [
      equipment('monitor', 'Acer XF240Q', [prosettingsJynxzi]),
      equipment('keyboard', 'Wooting 80HE Black', [prosettingsJynxzi]),
      equipment('headset', 'beyerdynamic MMX 300', [prosettingsJynxzi]),
    ],
    sources: [
      source(
        prosettingsJynxzi,
        'Jynxzi Rainbow Six Siege Settings, Crosshair & Config',
        'Настройки и оборудование Jynxzi для Rainbow Six Siege',
        'ProSettings.net',
        'https://prosettings.net/players/jynxzi/',
        '2026-06-10',
      ),
    ],
  }),
  profile({
    slug: 'asmongold',
    name: 'Asmongold',
    realName: { en: 'Zack Hoyt', ru: 'Зак Хойт' },
    aliases: ['zackrawrr', 'zack hoyt', 'asmon'],
    initials: 'AS',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'World of Warcraft and variety',
    eyebrowEn: 'MMO and commentary streamer',
    eyebrowRu: 'Стример MMO и разговорного контента',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/zackrawrr' },
      { label: 'YouTube', url: 'https://www.youtube.com/@AsmonTV' },
    ],
  }),
  profile({
    slug: 'caedrel',
    name: 'Caedrel',
    realName: { en: 'Marc Robert Lamont', ru: 'Марк Роберт Ламонт' },
    aliases: ['marc lamont', 'caedrel lol', 'pedro'],
    initials: 'CD',
    kinds: ['streamer', 'esports'],
    platforms: ['twitch', 'youtube', 'esports'],
    game: 'League of Legends',
    eyebrowEn: 'League of Legends caster and streamer',
    eyebrowRu: 'Комментатор и стример League of Legends',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/caedrel' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Caedrel' },
    ],
  }),
  profile({
    slug: 'hasanabi',
    name: 'HasanAbi',
    realName: { en: 'Hasan Piker', ru: 'Хасан Пайкер' },
    aliases: ['hasan piker', 'hasanabi', 'hasan'],
    initials: 'HA',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Just Chatting and variety',
    eyebrowEn: 'Commentary and variety streamer',
    eyebrowRu: 'Разговорный и variety-стример',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/hasanabi' },
      { label: 'YouTube', url: 'https://www.youtube.com/@HasanAbi' },
    ],
  }),
  profile({
    slug: 'caseoh',
    name: 'CaseOh',
    realName: { en: 'Case Baker', ru: 'Кейс Бейкер' },
    aliases: ['caseoh_', 'case baker', 'case'],
    initials: 'CO',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Variety',
    eyebrowEn: 'Variety gaming streamer',
    eyebrowRu: 'Игровой variety-стример',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/caseoh_' },
    ],
  }),
  profile({
    slug: 'xqc',
    name: 'xQc',
    realName: { en: 'Félix Lengyel', ru: 'Феликс Ленгель' },
    aliases: ['xqcow', 'felix lengyel', 'félix lengyel'],
    initials: 'XQ',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Variety',
    eyebrowEn: 'Canadian variety streamer',
    eyebrowRu: 'Канадский variety-стример',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/xqc' },
      { label: 'YouTube', url: 'https://www.youtube.com/@xQcOW' },
    ],
    historical: true,
    equipment: [
      equipment('monitor', 'ASUS ROG Swift PG259QN', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('mouse', 'Logitech G Pro X Superlight Magenta', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('keyboard', 'SteelSeries Apex 7 TKL Ghost', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('headset', 'HyperX Cloud II', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('mousepad', 'SteelSeries QcK Heavy', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('chair', 'Herman Miller Embody', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('microphone', 'Shure SM7B', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('camera', 'Logitech Brio', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('cpu', 'AMD Ryzen 9 7950X3D', [prosettingsXqc], 'historical', historicalXqcNote),
      equipment('gpu', 'NVIDIA GeForce RTX 4090', [prosettingsXqc], 'historical', historicalXqcNote),
    ],
    sources: [
      source(
        prosettingsXqc,
        'xQc Overwatch Settings, Crosshair & Config',
        'Настройки и оборудование xQc для Overwatch',
        'ProSettings.net',
        'https://prosettings.net/players/xqc/',
        '2023-08-02',
      ),
    ],
  }),
  profile({
    slug: 'ishowspeed',
    name: 'IShowSpeed',
    realName: { en: 'Darren Watkins Jr.', ru: 'Даррен Уоткинс-младший' },
    aliases: ['speed', 'darren watkins', 'ishowspeed'],
    initials: 'IS',
    kinds: ['streamer', 'youtuber'],
    platforms: ['youtube'],
    game: 'IRL and variety',
    eyebrowEn: 'YouTube and IRL streamer',
    eyebrowRu: 'YouTube- и IRL-стример',
    socials: [
      { label: 'YouTube', url: 'https://www.youtube.com/@IShowSpeed' },
    ],
  }),
  profile({
    slug: 'kai-cenat',
    name: 'Kai Cenat',
    realName: { en: 'Kailen Carlo Cenat III', ru: 'Кайлен Карло Сенат III' },
    aliases: ['kaicenat', 'kai', 'kailen cenat'],
    initials: 'KC',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Just Chatting and variety',
    eyebrowEn: 'Twitch and variety streamer',
    eyebrowRu: 'Twitch- и variety-стример',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/kaicenat' },
      { label: 'YouTube', url: 'https://www.youtube.com/@KaiCenat' },
    ],
  }),
  profile({
    slug: 'typical-gamer',
    name: 'Typical Gamer',
    realName: { en: 'Andre Rebelo', ru: 'Андре Ребело' },
    aliases: ['typicalgamer', 'andre rebelo', 'tg'],
    initials: 'TG',
    kinds: ['streamer', 'youtuber'],
    platforms: ['youtube'],
    game: 'Fortnite',
    eyebrowEn: 'Fortnite and YouTube Gaming streamer',
    eyebrowRu: 'Стример Fortnite и YouTube Gaming',
    socials: [
      { label: 'YouTube', url: 'https://www.youtube.com/@TypicalGamer' },
    ],
    equipment: [
      equipment('monitor', 'Alienware AW2518H', [prosettingsTypicalGamer]),
      equipment('mouse', 'Logitech G Pro X Superlight Black', [prosettingsTypicalGamer]),
      equipment('keyboard', 'SteelSeries Apex Pro', [prosettingsTypicalGamer]),
      equipment('headset', 'beyerdynamic DT 1990 PRO', [prosettingsTypicalGamer]),
      equipment('mousepad', 'Razer Gigantus V2', [prosettingsTypicalGamer]),
      equipment('chair', 'Herman Miller Aeron', [prosettingsTypicalGamer]),
      equipment('microphone', 'Shure SM7B', [prosettingsTypicalGamer]),
    ],
    sources: [
      source(
        prosettingsTypicalGamer,
        'Typical Gamer Fortnite Settings, Crosshair & Config',
        'Настройки и оборудование Typical Gamer для Fortnite',
        'ProSettings.net',
        'https://prosettings.net/players/typical-gamer/',
        '2026-03-11',
      ),
    ],
  }),
  profile({
    slug: 'shroud',
    name: 'shroud',
    realName: { en: 'Michael Grzesiek', ru: 'Майкл Гржесик' },
    aliases: ['michael grzesiek', 'shroud fps'],
    initials: 'SH',
    kinds: ['streamer', 'esports'],
    platforms: ['twitch', 'youtube', 'esports'],
    game: 'Competitive shooters',
    eyebrowEn: 'FPS streamer and former Counter-Strike pro',
    eyebrowRu: 'FPS-стример и бывший профессионал Counter-Strike',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/shroud' },
      { label: 'YouTube', url: 'https://www.youtube.com/@shroud' },
    ],
    equipment: [
      equipment('monitor', 'ASUS ROG PG27AQDM', [prosettingsShroud]),
      equipment('mouse', 'Logitech G Pro X2 SUPERSTRIKE', [prosettingsShroud]),
      equipment('keyboard', 'Logitech G Pro X TKL RAPID Black', [prosettingsShroud]),
      equipment('headset', 'Logitech G PRO X 2 Headset Black', [prosettingsShroud]),
      equipment('mousepad', 'Logitech G840 Darth Vader', [prosettingsShroud]),
      equipment('chair', 'Logitech G x Herman Miller Embody', [prosettingsShroud]),
      equipment('microphone', 'Shure SM7B', [prosettingsShroud]),
      equipment('audio-interface', 'Focusrite Scarlett 2i2', [prosettingsShroud]),
      equipment('camera', 'Sony Alpha A6000', [prosettingsShroud]),
      equipment('cpu', 'AMD Ryzen 7 9800X3D', [prosettingsShroud]),
      equipment('gpu', 'NVIDIA GeForce RTX 5090', [prosettingsShroud]),
    ],
    sources: [
      source(
        prosettingsShroud,
        'shroud Marvel Rivals Settings, Crosshair & Config',
        'Настройки и оборудование shroud',
        'ProSettings.net',
        'https://prosettings.net/players/shroud/',
        '2026-07-19',
      ),
    ],
  }),
  profile({
    slug: 'ninja',
    name: 'Ninja',
    realName: { en: 'Tyler Blevins', ru: 'Тайлер Блевинс' },
    aliases: ['tyler blevins', 'ninja fortnite', 'ninjasHyper'],
    initials: 'NJ',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Fortnite',
    eyebrowEn: 'Fortnite streamer and creator',
    eyebrowRu: 'Стример и автор по Fortnite',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/ninja' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Ninja' },
    ],
    equipment: [
      equipment('monitor', 'Alienware AW2518H', [prosettingsNinja]),
      equipment('mouse', 'Finalmouse Ultralight X Prophecy Clix Small', [prosettingsNinja]),
      equipment('keyboard', 'SteelSeries Apex Pro TKL', [prosettingsNinja]),
      equipment('headset', 'beyerdynamic DT 1990 PRO', [prosettingsNinja]),
      equipment('mousepad', 'HyperX Fury S Pro', [prosettingsNinja]),
      equipment('microphone', 'Electro-Voice RE20', [prosettingsNinja]),
      equipment('cpu', 'Intel Core i9-13900K', [prosettingsNinja]),
      equipment('gpu', 'NVIDIA GeForce RTX 4090', [prosettingsNinja]),
    ],
    sources: [
      source(
        prosettingsNinja,
        'Ninja Fortnite Settings, Crosshair & Config',
        'Настройки и оборудование Ninja для Fortnite',
        'ProSettings.net',
        'https://prosettings.net/players/ninja/',
        '2025-07-24',
      ),
    ],
  }),
  profile({
    slug: 'pokimane',
    name: 'Pokimane',
    realName: { en: 'Imane Anys', ru: 'Иман Анис' },
    aliases: ['imane anys', 'poki', 'pokimanelol'],
    initials: 'PK',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Variety',
    eyebrowEn: 'Variety streamer and creator',
    eyebrowRu: 'Variety-стример и автор',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/pokimane' },
      { label: 'YouTube', url: 'https://www.youtube.com/@pokimane' },
    ],
  }),
  profile({
    slug: 'valkyrae',
    name: 'Valkyrae',
    realName: { en: 'Rachell Hofstetter', ru: 'Рэйчел Хофстеттер' },
    aliases: ['rachell hofstetter', 'rae', 'valkyrae1'],
    initials: 'VR',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Variety',
    eyebrowEn: 'YouTube Gaming and variety creator',
    eyebrowRu: 'Автор YouTube Gaming и variety-контента',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/valkyrae' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Valkyrae' },
    ],
  }),
  profile({
    slug: 'clix',
    name: 'Clix',
    realName: { en: 'Cody Conrod', ru: 'Коди Конрод' },
    aliases: ['cody conrod', 'clix fortnite', 'nrg clix'],
    initials: 'CX',
    kinds: ['streamer', 'youtuber', 'esports'],
    platforms: ['twitch', 'youtube', 'esports'],
    game: 'Fortnite',
    eyebrowEn: 'Fortnite competitor and streamer',
    eyebrowRu: 'Игрок и стример по Fortnite',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/clix' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Clix' },
    ],
    equipment: [
      equipment('monitor', 'Alienware AW2523HF', [prosettingsClix]),
      equipment('mouse', 'Finalmouse Ultralight X Sakura', [prosettingsClix, clixTour], 'reported', clixTourNote),
      equipment('keyboard', 'SteelSeries Apex Pro Mini Black', [prosettingsClix, clixTour], 'reported', clixTourNote),
      equipment('headset', 'JBL Quantum 950X', [prosettingsClix]),
      equipment('mousepad', 'DR3AMIN Ivory', [prosettingsClix, clixTour], 'reported', clixTourNote),
      equipment('microphone', 'Shure SM7B', [prosettingsClix]),
      equipment('audio-interface', 'TC-Helicon GoXLR', [prosettingsClix]),
      equipment('camera', 'Sony A7 III', [prosettingsClix]),
      equipment('cpu', 'AMD Ryzen 7 9800X3D', [prosettingsClix]),
      equipment('gpu', 'NVIDIA GeForce RTX 5090', [prosettingsClix]),
      equipment('memory', 'G.SKILL Trident Z Neo 32 GB', [prosettingsClix]),
      equipment('case', 'Lian Li PC-O11', [prosettingsClix]),
      equipment('storage', 'Sabrent Rocket 2 TB', [prosettingsClix]),
      equipment('psu', 'EVGA SuperNOVA 1000 G5', [prosettingsClix]),
    ],
    sources: [
      source(
        prosettingsClix,
        'Clix Fortnite Settings, Crosshair & Config',
        'Настройки и оборудование Clix для Fortnite',
        'ProSettings.net',
        'https://prosettings.net/players/clix/',
        '2026-07-13',
      ),
      source(
        clixTour,
        'My $6,000,000 Dallas Penthouse Tour (2026)',
        'Тур Clix по пентхаусу в Далласе (2026)',
        'Clix (YouTube)',
        'https://www.youtube.com/watch?v=25sCzeRZIPY&t=829s',
        '2026-01-25',
      ),
    ],
  }),
  profile({
    slug: 'tenz',
    name: 'TenZ',
    realName: { en: 'Tyson Ngo', ru: 'Тайсон Нго' },
    aliases: ['tyson ngo', 'sentinels tenz', 'tenz valorant'],
    initials: 'TZ',
    kinds: ['streamer', 'youtuber', 'esports'],
    platforms: ['twitch', 'youtube', 'esports'],
    game: 'VALORANT',
    eyebrowEn: 'VALORANT streamer and former pro',
    eyebrowRu: 'Стример VALORANT и бывший профессиональный игрок',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/tenz' },
      { label: 'YouTube', url: 'https://www.youtube.com/@TenZ' },
    ],
    equipment: [
      equipment('monitor', 'Sony INZONE M10S', [prosettingsTenz]),
      equipment('mouse', 'Pulsar TenZ Signature Edition', [prosettingsTenz]),
      equipment('keyboard', 'Wooting 80HE TenZ Edition', [prosettingsTenz]),
      equipment('headset', 'Sony INZONE H9 II', [prosettingsTenz]),
      equipment('mousepad', 'Artisan Ninja FX Zero XSoft Black', [prosettingsTenz]),
      equipment('chair', 'Secretlab Titan Evo Jett', [prosettingsTenz]),
      equipment('microphone', 'Shure SM7B', [prosettingsTenz]),
      equipment('audio-interface', 'TC-Helicon GoXLR Mini', [prosettingsTenz]),
      equipment('camera', 'Logitech C920', [prosettingsTenz]),
      equipment('cpu', 'Intel Core i9-14900K', [prosettingsTenz]),
      equipment('gpu', 'MSI GeForce RTX 4090 Gaming X Trio', [prosettingsTenz]),
      equipment('motherboard', 'MSI MAG Z790 Tomahawk', [prosettingsTenz]),
      equipment('memory', 'TeamGroup T-Force Delta RGB DDR5 32 GB', [prosettingsTenz]),
      equipment('case', 'Lian Li O11 Dynamic EVO', [prosettingsTenz]),
    ],
    sources: [
      source(
        prosettingsTenz,
        'TenZ VALORANT Settings, Crosshair & Config',
        'Настройки и оборудование TenZ для VALORANT',
        'ProSettings.net',
        'https://prosettings.net/players/tenz/',
        '2026-06-08',
      ),
    ],
  }),
  profile({
    slug: 'tarik',
    name: 'tarik',
    realName: { en: 'Tarik Celik', ru: 'Тарик Челик' },
    aliases: ['tarik celik', 'tarik çelik', 'tarik valorant'],
    initials: 'TR',
    kinds: ['streamer', 'youtuber', 'esports'],
    platforms: ['twitch', 'youtube', 'esports'],
    game: 'VALORANT',
    eyebrowEn: 'VALORANT streamer and former CS pro',
    eyebrowRu: 'Стример VALORANT и бывший профессионал CS',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/tarik' },
      { label: 'YouTube', url: 'https://www.youtube.com/@tarik' },
    ],
    equipment: [
      equipment('monitor', 'ZOWIE XL2566K', [prosettingsTarik]),
      equipment('mouse', 'Finalmouse Ultralight X Large', [prosettingsTarik]),
      equipment('keyboard', 'Wooting 80HE Black', [prosettingsTarik]),
      equipment('headset', 'beyerdynamic DT 770 Pro', [prosettingsTarik]),
      equipment('mousepad', 'Finalmouse Horizon', [prosettingsTarik]),
      equipment('microphone', 'Shure SM7B', [prosettingsTarik]),
      equipment('audio-interface', 'TC-Helicon GoXLR', [prosettingsTarik]),
      equipment('camera', 'Logitech C920', [prosettingsTarik]),
      equipment('cpu', 'Intel Core i9-14900K', [prosettingsTarik]),
      equipment('gpu', 'MSI GeForce RTX 4090 Gaming X Trio', [prosettingsTarik]),
    ],
    sources: [
      source(
        prosettingsTarik,
        'tarik VALORANT Settings, Crosshair & Config',
        'Настройки и оборудование tarik для VALORANT',
        'ProSettings.net',
        'https://prosettings.net/players/tarik/',
        '2025-11-07',
      ),
    ],
  }),
  profile({
    slug: 'timthetatman',
    name: 'TimTheTatman',
    realName: { en: 'Timothy John Betar', ru: 'Тимоти Джон Бетар' },
    aliases: ['tim the tatman', 'timothy betar', 'tim'],
    initials: 'TT',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Call of Duty and variety',
    eyebrowEn: 'Battle royale and variety streamer',
    eyebrowRu: 'Стример battle royale и variety-контента',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/timthetatman' },
      { label: 'YouTube', url: 'https://www.youtube.com/@timthetatman' },
    ],
    equipment: [
      equipment('monitor', 'LG UltraGear 27GN750-B', [prosettingsTim]),
      equipment('mouse', 'Razer Viper V3 Pro Black', [prosettingsTim]),
      equipment('keyboard', 'Razer BlackWidow V4 75%', [prosettingsTim]),
      equipment('headset', 'Razer BlackShark V2 X', [prosettingsTim]),
      equipment('mousepad', 'HyperX Fury S Pro', [prosettingsTim]),
      equipment('microphone', 'Audio-Technica BP40', [prosettingsTim]),
      equipment('audio-interface', 'TC-Helicon GoXLR', [prosettingsTim]),
      equipment('cpu', 'Intel Core i9-12900K', [prosettingsTim]),
      equipment('gpu', 'NVIDIA GeForce RTX 3090', [prosettingsTim]),
      equipment('case', 'NZXT H710i', [prosettingsTim]),
    ],
    sources: [
      source(
        prosettingsTim,
        'TimTheTatman Call of Duty: Warzone Settings & Config',
        'Настройки и оборудование TimTheTatman для Warzone',
        'ProSettings.net',
        'https://prosettings.net/players/timthetatman/',
        '2025-05-21',
      ),
    ],
  }),
  profile({
    slug: 'emiru',
    name: 'Emiru',
    realName: { en: 'Emily Schunk', ru: 'Эмили Шанк' },
    aliases: ['emily schunk', 'emiru1', 'emi'],
    initials: 'EM',
    kinds: ['streamer', 'youtuber'],
    platforms: ['twitch', 'youtube'],
    game: 'Variety',
    eyebrowEn: 'Variety streamer and cosplayer',
    eyebrowRu: 'Variety-стример и косплеер',
    socials: [
      { label: 'Twitch', url: 'https://www.twitch.tv/emiru' },
      { label: 'YouTube', url: 'https://www.youtube.com/@Emiru' },
    ],
  }),
  profile({
    slug: 'ludwig',
    name: 'Ludwig',
    realName: { en: 'Ludwig Ahgren', ru: 'Людвиг Агрен' },
    aliases: ['ludwig ahgren', 'ludwiggg', 'mogul mail'],
    initials: 'LW',
    kinds: ['streamer', 'youtuber'],
    platforms: ['youtube'],
    game: 'Variety',
    eyebrowEn: 'Variety streamer and creator',
    eyebrowRu: 'Variety-стример и автор',
    socials: [
      { label: 'YouTube', url: 'https://www.youtube.com/@ludwig' },
    ],
  }),
]

const batch = {
  format: 'setupindex.creator-batch',
  version: 1,
  operations: documents.map(document => ({
    action: 'create',
    document,
  })),
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')

console.log(`Wrote ${documents.length} creator operations to ${outputPath}`)
