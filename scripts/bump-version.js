#!/usr/bin/env node
/**
 * Version bump script
 * Run this before each commit to increment the version number
 * Usage: node scripts/bump-version.js
 */

const fs = require('fs')
const path = require('path')

// Paths to files that contain version
const versionFilePath = path.join(__dirname, '..', 'src', 'lib', 'version.ts')
const pageFilePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx')

// Read current version from version.ts
const versionFileContent = fs.readFileSync(versionFilePath, 'utf8')
const versionMatch = versionFileContent.match(/VERSION = '(\d+)\.(\d+)\.(\d+)'/)

if (!versionMatch) {
  console.error('Could not find version in version.ts')
  process.exit(1)
}

const major = parseInt(versionMatch[1])
const minor = parseInt(versionMatch[2])
const patch = parseInt(versionMatch[3])

// Increment version - after X.Y.9, go to X.(Y+1).0
let newMajor = major
let newMinor = minor
let newPatch = patch + 1

if (newPatch > 9) {
  newPatch = 0
  newMinor = minor + 1
}

if (newMinor > 9) {
  newMinor = 0
  newMajor = major + 1
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`

console.log(`Bumping version: ${major}.${minor}.${patch} -> ${newVersion}`)

// Update version.ts
const newVersionFileContent = `// Version number - auto-incremented on each commit
export const VERSION = '${newVersion}'
`
fs.writeFileSync(versionFilePath, newVersionFileContent, 'utf8')

// Update page.tsx
let pageContent = fs.readFileSync(pageFilePath, 'utf8')
pageContent = pageContent.replace(
  /גירסה \d+\.\d+\.\d+/,
  `גירסה ${newVersion}`
)
fs.writeFileSync(pageFilePath, pageContent, 'utf8')

console.log(`Version updated to ${newVersion} in:`)
console.log('  - src/lib/version.ts')
console.log('  - src/app/page.tsx')
