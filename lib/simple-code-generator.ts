/**
 * 간단하고 확실한 코드 생성 시스템
 * 복잡한 로직 없이 기본에 충실하게
 */

/**
 * 간단한 6자리 코드 생성
 * S로 시작하는 학교 코드, C로 시작하는 학급 코드
 */
export function generateSimpleCode(type: 'SCHOOL' | 'CLASS'): string {
  const prefix = type === 'SCHOOL' ? 'S' : 'C'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동되는 문자 제외
  
  let code = prefix
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  
  return code
}

/**
 * 현재 시간 기반으로 더 유니크한 코드 생성
 */
export function generateTimeBasedCode(type: 'SCHOOL' | 'CLASS'): string {
  const prefix = type === 'SCHOOL' ? 'S' : 'C'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  
  // 현재 시간의 마지막 5자리를 기반으로 시드 생성
  const timestamp = Date.now()
  const timeStr = timestamp.toString()
  const timeSeed = timeStr.slice(-5)
  
  let code = prefix
  for (let i = 0; i < 5; i++) {
    // 시간 + 인덱스 + 랜덤을 조합
    const seed = (parseInt(timeSeed[i] || '0') + i + Math.floor(Math.random() * 10)) % chars.length
    code += chars[seed]
  }
  
  return code
}