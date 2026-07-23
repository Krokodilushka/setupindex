function channelToHex(value: number): string {
  return Math.round(value * 255).toString(16).padStart(2, '0')
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)

  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }

  return `#${channelToHex(channel(0))}${channelToHex(channel(8))}${channelToHex(channel(4))}`
}

/**
 * Returns a stable, bright accent color for a creator identity.
 * The slug is the public stable ID, so the color changes only if the slug does.
 */
export function creatorAccent(identity: string): string {
  let hash = 2166136261
  for (let index = 0; index < identity.length; index++) {
    hash ^= identity.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  hash >>>= 0

  const hue = hash % 360
  const saturation = 68 + ((hash >>> 8) % 13)
  const lightness = 61 + ((hash >>> 16) % 7)

  return hslToHex(hue, saturation, lightness)
}

export function withCreatorAccent<T extends { slug: string }>(creator: T): T & { accent: string } {
  return {
    ...creator,
    accent: creatorAccent(creator.slug),
  }
}
