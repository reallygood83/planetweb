/**
 * 학교 코드 및 학급 코드 통합 생성 시스템
 * 
 * 특징:
 * - 충돌 방지를 위한 유니크 코드 생성
 * - 읽기 쉬운 형식 (혼동되는 문자 제외)
 * - 체계적인 재시도 로직
 * - 타입 안전성
 */

import { createClient } from '@/lib/supabase/server'

export type CodeType = 'SCHOOL' | 'CLASS'

export interface CodeGenerationResult {
  success: boolean
  code?: string
  error?: string
  attempts?: number
}

export interface CodeValidationResult {
  isValid: boolean
  isAvailable: boolean
  existingRecord?: any
  error?: string
}

/**
 * 혼동하기 쉬운 문자들을 제외한 안전한 문자셋
 * 제외된 문자: 0(zero), O(오), 1(one), I(아이), l(엘)
 */
const SAFE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * 코드 생성 설정
 */
const CODE_CONFIG = {
  SCHOOL: {
    length: 6,
    prefix: 'S',
    maxAttempts: 100,
    tableName: 'school_codes',
    columnName: 'code'
  },
  CLASS: {
    length: 6,
    prefix: 'C',
    maxAttempts: 100,
    tableName: 'classes',
    columnName: 'school_code'
  }
} as const

/**
 * 안전한 랜덤 코드 생성
 * @param type 코드 타입 (SCHOOL 또는 CLASS)
 * @returns 생성된 코드 문자열
 */
export function generateRandomCode(type: CodeType): string {
  const config = CODE_CONFIG[type]
  const codeLength = config.length - 1 // prefix 제외
  
  let code = config.prefix
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARSET.length)
    code += SAFE_CHARSET[randomIndex]
  }
  
  return code
}

/**
 * 코드 유효성 검증 (형식 및 중복 체크)
 * @param code 검증할 코드
 * @param type 코드 타입
 * @returns 검증 결과
 */
export async function validateCode(
  code: string, 
  type: CodeType
): Promise<CodeValidationResult> {
  try {
    const config = CODE_CONFIG[type]
    
    // 형식 검증
    if (!code || code.length !== config.length) {
      return {
        isValid: false,
        isAvailable: false,
        error: `코드는 ${config.length}자리여야 합니다.`
      }
    }
    
    if (!code.startsWith(config.prefix)) {
      return {
        isValid: false,
        isAvailable: false,
        error: `${type} 코드는 ${config.prefix}로 시작해야 합니다.`
      }
    }
    
    // 허용된 문자만 사용하는지 검증
    const allowedPattern = new RegExp(`^${config.prefix}[${SAFE_CHARSET}]+$`)
    if (!allowedPattern.test(code)) {
      return {
        isValid: false,
        isAvailable: false,
        error: '허용되지 않은 문자가 포함되어 있습니다.'
      }
    }
    
    // 데이터베이스 중복 검증
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(config.tableName)
      .select('*')
      .eq(config.columnName, code)
      .maybeSingle()
    
    if (error) {
      console.error('코드 중복 검증 오류:', error)
      return {
        isValid: true,
        isAvailable: false,
        error: '데이터베이스 검증 중 오류가 발생했습니다.'
      }
    }
    
    return {
      isValid: true,
      isAvailable: !data,
      existingRecord: data || undefined
    }
  } catch (error) {
    console.error('코드 검증 오류:', error)
    return {
      isValid: false,
      isAvailable: false,
      error: '코드 검증 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 유니크한 코드 생성 (중복 방지)
 * @param type 코드 타입
 * @returns 생성 결과
 */
export async function generateUniqueCode(type: CodeType): Promise<CodeGenerationResult> {
  const config = CODE_CONFIG[type]
  let attempts = 0
  
  while (attempts < config.maxAttempts) {
    attempts++
    
    try {
      const code = generateRandomCode(type)
      const validation = await validateCode(code, type)
      
      if (validation.isValid && validation.isAvailable) {
        return {
          success: true,
          code,
          attempts
        }
      }
      
      if (!validation.isValid) {
        // 형식이 잘못된 경우는 재시도하지 않고 즉시 오류 반환
        return {
          success: false,
          error: validation.error,
          attempts
        }
      }
      
      // 중복인 경우 재시도
      continue
      
    } catch (error) {
      console.error(`코드 생성 시도 ${attempts} 실패:`, error)
      
      if (attempts >= config.maxAttempts) {
        return {
          success: false,
          error: '코드 생성 중 오류가 발생했습니다.',
          attempts
        }
      }
    }
  }
  
  return {
    success: false,
    error: `${config.maxAttempts}번 시도 후에도 유니크한 코드를 생성할 수 없습니다.`,
    attempts
  }
}

/**
 * 기존 코드 재생성 (문제가 있는 코드를 새것으로 교체)
 * @param oldCode 기존 코드
 * @param type 코드 타입
 * @returns 새로운 코드 생성 결과
 */
export async function regenerateCode(
  oldCode: string, 
  type: CodeType
): Promise<CodeGenerationResult> {
  try {
    const newCodeResult = await generateUniqueCode(type)
    
    if (!newCodeResult.success) {
      return newCodeResult
    }
    
    console.log(`코드 재생성 완료: ${oldCode} → ${newCodeResult.code}`)
    
    return newCodeResult
  } catch (error) {
    console.error('코드 재생성 오류:', error)
    return {
      success: false,
      error: '코드 재생성 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 코드 타입 감지 (기존 코드의 타입을 자동 판별)
 * @param code 판별할 코드
 * @returns 코드 타입 또는 null
 */
export function detectCodeType(code: string): CodeType | null {
  if (!code || code.length < 1) return null
  
  const firstChar = code[0].toUpperCase()
  
  if (firstChar === 'S' && code.length === CODE_CONFIG.SCHOOL.length) {
    return 'SCHOOL'
  }
  
  if (firstChar === 'C' && code.length === CODE_CONFIG.CLASS.length) {
    return 'CLASS'
  }
  
  return null
}

/**
 * 코드 포맷 표준화 (대소문자 통일, 공백 제거 등)
 * @param code 원본 코드
 * @returns 표준화된 코드
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * 코드 정보 조회 (타입, 설정 등)
 * @param type 코드 타입
 * @returns 코드 설정 정보
 */
export function getCodeInfo(type: CodeType) {
  return {
    ...CODE_CONFIG[type],
    charset: SAFE_CHARSET,
    format: `${CODE_CONFIG[type].prefix}XXXXX (${CODE_CONFIG[type].length}자리)`
  }
}