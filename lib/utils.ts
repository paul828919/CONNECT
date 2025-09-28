import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Korean business registration number validation
export function validateBusinessRegistrationNumber(number: string): boolean {
  // Remove hyphens and spaces
  const cleanNumber = number.replace(/[-\s]/g, '')

  // Check if it's 10 digits
  if (!/^\d{10}$/.test(cleanNumber)) {
    return false
  }

  // Korean business registration number checksum validation
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  const digits = cleanNumber.split('').map(Number)

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i]
  }

  const remainder = sum % 10
  const checkDigit = remainder === 0 ? 0 : 10 - remainder

  return checkDigit === digits[9]
}

// Format Korean currency
export function formatKoreanCurrency(amount: number): string {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const remainder = amount % 100000000
    const man = Math.floor(remainder / 10000)

    if (man === 0) {
      return `${eok}억원`
    }
    return `${eok}억 ${man}만원`
  } else if (amount >= 10000) {
    const man = Math.floor(amount / 10000)
    const remainder = amount % 10000

    if (remainder === 0) {
      return `${man}만원`
    }
    return `${man}만 ${remainder.toLocaleString()}원`
  } else {
    return `${amount.toLocaleString()}원`
  }
}

// Calculate days until deadline
export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date()
  const diffTime = deadline.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Get urgency level based on days until deadline
export function getUrgencyLevel(daysUntil: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysUntil <= 3) return 'critical'
  if (daysUntil <= 7) return 'high'
  if (daysUntil <= 14) return 'medium'
  return 'low'
}

// Format date in Korean locale
export function formatKoreanDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Generate content hash for change detection
export function generateContentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}