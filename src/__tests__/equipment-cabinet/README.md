# Equipment Cabinet - Test Suite

Comprehensive test suite for the Equipment Cabinet system (ארון ציוד).

## Test Files

### 1. `rls-policies.test.ts`
Tests for Row Level Security (RLS) policies on all Equipment Cabinet tables:
- `activity_log` - Activity logging policies
- `admin_notifications` - Notification access policies
- `borrow_history` - Borrowing history policies
- `equipment_requests` - Request creation and viewing policies
- `request_items` - Request item policies
- `signed_forms` - Form access policies
- `cities` - City read/write policies
- `global_equipment_pool` - Equipment pool policies
- `city_equipment` - City-specific equipment policies

**Key Tests:**
- Public vs authenticated access
- Super admin permissions
- City manager permissions
- SQL injection prevention
- Concurrent access handling
- Performance benchmarks

### 2. `api-requests.test.ts`
Tests for `/api/requests/*` endpoints:
- `POST /api/requests/create` - Create new equipment requests
- `POST /api/requests/verify` - Verify request tokens
- `POST /api/requests/confirm-pickup` - Confirm equipment pickup
- `POST /api/requests/extend-token` - Extend token expiration
- `POST /api/requests/cancel-token` - Cancel request token
- `POST /api/requests/manage` - Approve/reject requests

**Key Tests:**
- Valid request creation
- Missing required fields
- Non-existent equipment
- Overdue borrower detection
- Token validation
- Expired tokens
- Signature verification

### 3. `api-city-equipment.test.ts`
Tests for `/api/city-equipment` endpoint:
- `GET /api/city-equipment` - Fetch city equipment
- `POST /api/city-equipment` - Add equipment to city
- `PUT /api/city-equipment` - Update equipment
- `DELETE /api/city-equipment` - Remove equipment from city

**Key Tests:**
- Authentication requirements
- Parameter validation
- Equipment status management
- Consumable equipment handling
- Display order sorting
- Missing cityId handling

### 4. `utility-functions.test.ts`
Tests for utility functions:

**Token Utilities (`lib/token.ts`):**
- `generateToken()` - Generate secure tokens
- `hashToken()` - Hash tokens with SHA-256
- `verifyToken()` - Verify token against hash
- `getTokenExpiry()` - Calculate expiration
- `isTokenExpired()` - Check expiration status
- `createRequestToken()` - Complete token package

**Activity Logger (`lib/activity-logger.ts`):**
- `logActivity()` - Log manager actions
- `getActivityLogs()` - Retrieve activity logs
- `ActivityActions` - Action type constants

**Other Utilities:**
- Distance calculation (Haversine formula)
- Phone number normalization

### 5. `integration-workflow.test.ts`
End-to-end integration tests for complete workflows:

**Complete Request-to-Borrow Workflow:**
1. User creates equipment request
2. User verifies token is valid
3. Manager approves request
4. User confirms pickup with signature
5. Borrow history is created
6. Signed form is created
7. Request status changes to completed

**Other Workflows:**
- Overdue equipment detection
- Equipment return process
- Multiple equipment items request
- Activity logging throughout workflow
- Error handling and edge cases
- Out of stock handling

## Running Tests

### Run all Equipment Cabinet tests:
```bash
npm test src/__tests__/equipment-cabinet
```

### Run specific test file:
```bash
npm test src/__tests__/equipment-cabinet/rls-policies.test.ts
npm test src/__tests__/equipment-cabinet/api-requests.test.ts
npm test src/__tests__/equipment-cabinet/api-city-equipment.test.ts
npm test src/__tests__/equipment-cabinet/utility-functions.test.ts
npm test src/__tests__/equipment-cabinet/integration-workflow.test.ts
```

### Run in watch mode:
```bash
npm test -- --watch src/__tests__/equipment-cabinet
```

### Run with coverage:
```bash
npm test -- --coverage src/__tests__/equipment-cabinet
```

## Environment Variables Required

The tests require the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` - Application URL (defaults to http://localhost:3000)

## Test Database

**Important:** Tests use the following test IDs that won't conflict with production data:
- Test City ID: `00000000-0000-0000-0000-000000000099`
- Test Equipment IDs: `00000000-0000-0000-0000-00000000000X` (where X is 1-5)
- Test Category ID: `00000000-0000-0000-0000-000000000050`
- Test User IDs: `00000000-0000-0000-0000-00000000000X` (where X is 1-2)

All test data is cleaned up in `afterAll` hooks.

## Test Coverage

The test suite covers:
- ✅ RLS Policies (all Equipment Cabinet tables)
- ✅ API Endpoints (requests, equipment management)
- ✅ Utility Functions (tokens, activity logging)
- ✅ Integration Workflows (end-to-end scenarios)
- ✅ Error Handling (validation, edge cases)
- ✅ Security (SQL injection, authentication)
- ✅ Performance (query efficiency, pagination)

## Known Limitations

Some tests require authentication setup and are currently skipped:
- Manager actions (extend token, cancel token, manage requests)
- Equipment management operations (add, update, delete)

These would require creating authenticated sessions with proper roles, which is beyond the scope of basic unit tests.

## Future Improvements

Potential additions to the test suite:
1. Component tests for React components
2. UI integration tests with React Testing Library
3. E2E tests with Playwright or Cypress
4. Load testing for high-traffic scenarios
5. Security penetration testing
6. Accessibility testing (a11y)
