# Testing Guide - How to Add More Tests

## 🎯 Quick Start

This project uses:
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **TypeScript** - Type safety

## 📁 Test File Structure

```
src/
├── __tests__/
│   ├── lib/
│   │   ├── validation.test.ts    ✅ Utility tests
│   │   ├── utils.test.ts         ✅ Helper tests
│   │   └── supabase.test.ts      ✅ Client tests
│   ├── components/
│   │   └── ui/
│   │       └── button.test.tsx   ✅ Component tests
│   └── types/
│       └── index.test.ts         ✅ Type tests
```

## 🧪 Test Examples

### 1. Testing Utility Functions

```typescript
// src/lib/validation.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// src/__tests__/lib/validation.test.ts
import { validateEmail } from '@/lib/validation'

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user@domain.co.il')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
    expect(validateEmail('test@')).toBe(false)
  })
})
```

---

### 2. Testing React Components

```typescript
// src/__tests__/components/equipment-card.test.tsx
import { render, screen } from '@testing-library/react'
import { EquipmentCard } from '@/components/equipment-card'

describe('EquipmentCard', () => {
  const mockEquipment = {
    id: '1',
    name: 'פנס ראש',
    quantity: 5,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }

  it('displays equipment name', () => {
    render(<EquipmentCard equipment={mockEquipment} />)
    expect(screen.getByText('פנס ראש')).toBeInTheDocument()
  })

  it('displays quantity', () => {
    render(<EquipmentCard equipment={mockEquipment} />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('shows available status when quantity > 0', () => {
    render(<EquipmentCard equipment={mockEquipment} />)
    expect(screen.getByText(/זמין/)).toBeInTheDocument()
  })
})
```

---

### 3. Testing User Interactions

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('BorrowForm', () => {
  it('handles form submission', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    
    render(<BorrowForm onSubmit={onSubmit} />)
    
    // Fill form
    await user.type(screen.getByLabelText(/שם/), 'יוסי')
    await user.type(screen.getByLabelText(/טלפון/), '0501234567')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /השאל/ }))
    
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'יוסי',
      phone: '0501234567'
    })
  })
})
```

---

### 4. Testing with Mocked Supabase

```typescript
// Mock Supabase at the top of your test file
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Test Equipment', quantity: 5 }
        ],
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    }))
  }
}))

describe('fetchEquipment', () => {
  it('fetches equipment from database', async () => {
    const result = await fetchEquipment()
    
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Test Equipment')
  })
})
```

---

### 5. Testing Async Operations

```typescript
describe('borrowEquipment', () => {
  it('creates borrow record and updates quantity', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ 
      data: { id: '1' }, 
      error: null 
    })
    
    const mockUpdate = jest.fn().mockResolvedValue({ 
      error: null 
    })
    
    // Mock implementation
    jest.spyOn(supabase, 'from').mockImplementation((table) => ({
      insert: mockInsert,
      update: mockUpdate,
      eq: jest.fn().mockReturnThis()
    } as any))
    
    await borrowEquipment({
      name: 'Test User',
      phone: '0501234567',
      equipment_id: '123'
    })
    
    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })
})
```

---

### 6. Testing Error Handling

```typescript
describe('error handling', () => {
  it('handles database errors gracefully', async () => {
    const mockError = { message: 'Database error' }
    
    jest.spyOn(supabase, 'from').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({ 
        data: null, 
        error: mockError 
      })
    } as any))
    
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    
    await fetchEquipment()
    
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching equipment:', 
      mockError
    )
    
    consoleError.mockRestore()
  })
})
```

---

### 7. Testing Page Components

```typescript
// src/__tests__/app/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

// Mock Supabase
jest.mock('@/lib/supabase')

describe('Home Page', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  it('renders main heading', () => {
    render(<Home />)
    expect(screen.getByText('ארון ציוד ידידים')).toBeInTheDocument()
  })

  it('shows borrow tab by default', () => {
    render(<Home />)
    expect(screen.getByText('השאלת ציוד 📦')).toBeInTheDocument()
  })

  it('switches to return tab', async () => {
    const user = userEvent.setup()
    render(<Home />)
    
    await user.click(screen.getByText('החזרת ציוד 🔁'))
    
    expect(screen.getByText('הזן מספר טלפון כדי לצפות בציוד שהשאלת'))
      .toBeInTheDocument()
  })
})
```

---

## 🎨 Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should do something', () => {
  // Arrange - Set up test data
  const input = 'test'
  const expected = 'TEST'
  
  // Act - Execute the function
  const result = toUpperCase(input)
  
  // Assert - Verify the result
  expect(result).toBe(expected)
})
```

### Given-When-Then Pattern

```typescript
describe('Phone validation', () => {
  describe('Given a valid Israeli phone number', () => {
    it('When validating, Then returns true', () => {
      const phone = '0501234567'
      
      const isValid = validatePhone(phone)
      
      expect(isValid).toBe(true)
    })
  })
})
```

---

## 🔄 Before/After Hooks

```typescript
describe('Feature', () => {
  let mockData: any

  beforeAll(() => {
    // Runs once before all tests
    console.log('Starting test suite')
  })

  beforeEach(() => {
    // Runs before each test
    mockData = { id: 1, name: 'Test' }
  })

  afterEach(() => {
    // Runs after each test
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Runs once after all tests
    console.log('Finished test suite')
  })

  it('test 1', () => {
    expect(mockData).toBeDefined()
  })
})
```

---

## 📊 Coverage Goals

| Category | Target |
|----------|--------|
| Utilities | 100% |
| Components | 80% |
| Pages | 60% |
| Overall | 70% |

---

## ✅ Testing Checklist

When adding new features, test:

- [ ] Happy path (expected behavior)
- [ ] Edge cases (empty, null, undefined)
- [ ] Error cases (invalid input)
- [ ] Boundary conditions (min/max values)
- [ ] User interactions (clicks, typing)
- [ ] Async operations (loading, success, error)
- [ ] Form validation
- [ ] Accessibility (screen readers)

---

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test validation

# Run in watch mode
npm run test:watch

# Generate coverage
npm run test:coverage

# Run with verbose output
npm test -- --verbose

# Run only changed files
npm test -- --onlyChanged
```

---

## 🐛 Debugging Tests

### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Single Test

```typescript
it.only('this test will run alone', () => {
  // Your test
})
```

### Skip Test

```typescript
it.skip('this test will be skipped', () => {
  // Your test
})
```

---

## 📝 Best Practices

### ✅ Do

```typescript
// Clear test names
it('validates Israeli phone numbers with dashes', () => {})

// Test one thing per test
it('accepts valid phone', () => {})
it('rejects invalid phone', () => {})

// Use descriptive variables
const validPhone = '0501234567'
const invalidPhone = '123'

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks()
})
```

### ❌ Don't

```typescript
// Vague test names
it('works', () => {})

// Test multiple things in one test
it('validates everything', () => {
  // Testing phone, email, name...
})

// Hardcoded magic values
expect(result).toBe('05123456789')

// Shared mutable state
let data = {} // Avoid
```

---

## 🎯 Next Steps

1. **Add integration tests** for page components
2. **Mock Supabase client** in all component tests
3. **Add E2E tests** with Playwright (future)
4. **Increase coverage** to 70%+

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
