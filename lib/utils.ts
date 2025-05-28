import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validation functions
export function validateNeisCompliance(content: string) {
  const forbiddenWords = ['뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한']
  const maxLength = 500
  
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    characterCount: content.length
  }
  
  // Check length
  if (content.length > maxLength) {
    validation.isValid = false
    validation.errors.push(`글자 수 초과: ${content.length}자 (최대 ${maxLength}자)`)
  }
  
  // Check forbidden words
  forbiddenWords.forEach(word => {
    if (content.includes(word)) {
      validation.warnings.push(`금지어 발견: "${word}"`)
    }
  })
  
  // Check ending (should end with 함, 임, 됨, 음)
  const validEndings = ['함', '임', '됨', '음', '함.', '임.', '됨.', '음.']
  const lastChar = content.trim().slice(-2)
  if (!validEndings.some(ending => lastChar.endsWith(ending))) {
    validation.warnings.push('명사형 종결어미로 끝나지 않습니다')
  }
  
  return validation
}

// Format date for Korean display
export function formatDateKorean(date: string | Date) {
  const d = new Date(date)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

// Generate random school code
export function generateSchoolCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Parse CSV content
export function parseStudentCSV(csvContent: string): { number: number; name: string }[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const students = []
  
  // Skip header if exists
  const startIndex = lines[0].toLowerCase().includes('번호') ? 1 : 0
  
  for (let i = startIndex; i < lines.length; i++) {
    const [number, name] = lines[i].split(',').map(item => item.trim())
    if (number && name) {
      students.push({
        number: parseInt(number),
        name: name
      })
    }
  }
  
  return students
}

// Encrypt/decrypt API key (client-side only)
export function encryptApiKey(apiKey: string, encryptKey: string): string {
  // Simple XOR encryption for client-side storage
  // In production, use a proper encryption library
  const encrypted = apiKey.split('').map((char, i) => {
    const keyChar = encryptKey[i % encryptKey.length]
    return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
  }).join('')
  
  return btoa(encrypted) // Base64 encode
}

export function decryptApiKey(encrypted: string, encryptKey: string): string {
  try {
    const decoded = atob(encrypted) // Base64 decode
    return decoded.split('').map((char, i) => {
      const keyChar = encryptKey[i % encryptKey.length]
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
    }).join('')
  } catch {
    return ''
  }
}

// Get API key hint (last 4 characters)
export function getApiKeyHint(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) return ''
  return `...${apiKey.slice(-4)}`
}

// Validate Gemini API key format
export function validateGeminiApiKey(apiKey: string): boolean {
  return apiKey.startsWith('AIza') && apiKey.length === 39
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Export content as different formats
export function exportAsText(contents: { studentName: string; content: string }[]): string {
  return contents.map(({ studentName, content }) => 
    `[${studentName}]\n${content}\n`
  ).join('\n---\n\n')
}

export function exportAsCSV(contents: { studentName: string; content: string }[]): string {
  const header = '학생이름,내용\n'
  const rows = contents.map(({ studentName, content }) => 
    `"${studentName}","${content.replace(/"/g, '""')}"`
  ).join('\n')
  
  return header + rows
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}