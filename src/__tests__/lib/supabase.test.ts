import { supabase } from '@/lib/supabase'

describe('Supabase Client', () => {
  it('should be defined', () => {
    expect(supabase).toBeDefined()
  })

  it('should have supabase url configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
  })

  it('should have supabase anon key configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
  })

  it('should have from method', () => {
    expect(supabase.from).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
