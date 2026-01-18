#!/bin/bash

# Equipment Cabinet Test Runner
# Runs all Equipment Cabinet tests with various options

set -e

echo "🧪 Equipment Cabinet Test Suite"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found${NC}"
    echo "Please create .env.local with required environment variables:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - NEXT_PUBLIC_APP_URL"
    exit 1
fi

# Parse command line arguments
TEST_FILE=""
WATCH_MODE=false
COVERAGE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --rls)
            TEST_FILE="rls-policies.test.ts"
            shift
            ;;
        --api-requests)
            TEST_FILE="api-requests.test.ts"
            shift
            ;;
        --api-equipment)
            TEST_FILE="api-city-equipment.test.ts"
            shift
            ;;
        --utils)
            TEST_FILE="utility-functions.test.ts"
            shift
            ;;
        --integration)
            TEST_FILE="integration-workflow.test.ts"
            shift
            ;;
        --watch|-w)
            WATCH_MODE=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run-tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --rls              Run RLS policies tests only"
            echo "  --api-requests     Run API requests tests only"
            echo "  --api-equipment    Run API city equipment tests only"
            echo "  --utils            Run utility functions tests only"
            echo "  --integration      Run integration workflow tests only"
            echo "  --watch, -w        Run in watch mode"
            echo "  --coverage, -c     Generate coverage report"
            echo "  --verbose, -v      Verbose output"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run-tests.sh                    # Run all tests"
            echo "  ./run-tests.sh --rls             # Run RLS tests only"
            echo "  ./run-tests.sh --watch           # Run all tests in watch mode"
            echo "  ./run-tests.sh --coverage        # Run all tests with coverage"
            echo "  ./run-tests.sh --api-requests -v # Run API tests with verbose output"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build test command
TEST_CMD="npm test"
TEST_PATH="src/__tests__/equipment-cabinet"

if [ -n "$TEST_FILE" ]; then
    TEST_PATH="$TEST_PATH/$TEST_FILE"
    echo -e "${YELLOW}📝 Running specific test: $TEST_FILE${NC}"
else
    echo -e "${YELLOW}📝 Running all Equipment Cabinet tests${NC}"
fi

# Add options
if [ "$WATCH_MODE" = true ]; then
    TEST_CMD="$TEST_CMD -- --watch"
    echo -e "${YELLOW}👁️  Watch mode enabled${NC}"
fi

if [ "$COVERAGE" = true ]; then
    TEST_CMD="$TEST_CMD -- --coverage"
    echo -e "${YELLOW}📊 Coverage reporting enabled${NC}"
fi

if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD -- --verbose"
    echo -e "${YELLOW}🔍 Verbose mode enabled${NC}"
fi

TEST_CMD="$TEST_CMD $TEST_PATH"

echo ""
echo -e "${GREEN}🚀 Running: $TEST_CMD${NC}"
echo ""

# Run tests
eval $TEST_CMD

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
