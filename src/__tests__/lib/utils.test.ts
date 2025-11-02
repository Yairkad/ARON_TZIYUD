import { cn } from '@/lib/utils'

describe('Utils - cn function', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'not-included')
    expect(result).toContain('base')
    expect(result).toContain('conditional')
    expect(result).not.toContain('not-included')
  })

  it('should handle undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should merge tailwind conflicting classes correctly', () => {
    // twMerge should resolve conflicts
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle arrays', () => {
    const result = cn(['class1', 'class2'])
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })
})
