import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const platform = process.platform
let python = null

// Check for venv Python first
const venvPython = platform === 'win32'
  ? path.join('backend', 'venv', 'Scripts', 'python.exe')
  : path.join('backend', 'venv', 'bin', 'python')

if (existsSync(venvPython)) {
  python = venvPython
} else {
  // Fall back to system Python
  python = platform === 'win32' ? 'python' : 'python3'
}

console.log(`[build:backend] Using Python: ${python}`)

// Use absolute path for spec file to help PyInstaller resolve paths correctly
import { resolve } from 'node:path'
const specPath = resolve(process.cwd(), 'backend', 'pyinstaller.spec')

const result = spawnSync(
  python,
  ['-m', 'PyInstaller', specPath, '--distpath', 'backend/dist', '--workpath', 'backend/build', '--clean'],
  { stdio: 'inherit', shell: false, cwd: process.cwd() }
)

if (result.error) {
  console.error(`[build:backend] Failed to run PyInstaller: ${result.error.message}`)
  process.exit(1)
}

if (result.status !== 0) {
  console.error(`[build:backend] PyInstaller exited with code ${result.status}`)
  process.exit(result.status)
}

console.log('[build:backend] Backend build complete!')
