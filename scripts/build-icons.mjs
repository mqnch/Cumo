import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import iconGen from 'icon-gen'

const rootDir = process.cwd()
const svgPath = path.join(rootDir, 'public', 'cumo.svg')
const outDir = path.join(rootDir, 'build', 'icons')

await mkdir(outDir, { recursive: true })

const sizes = [16, 32, 64, 128, 256, 512, 1024]

for (const size of sizes) {
  const outPath = path.join(outDir, `icon-${size}.png`)
  // eslint-disable-next-line no-await-in-loop
  await sharp(svgPath).resize(size, size).png().toFile(outPath)
}

const basePng = path.join(outDir, 'icon-1024.png')

await iconGen(basePng, outDir, {
  icns: { name: 'icon' },
  ico: { name: 'icon' },
  report: false,
})

// Ensure Linux icon name expected by electron-builder
const linuxIcon = path.join(outDir, '512x512.png')
await sharp(svgPath).resize(512, 512).png().toFile(linuxIcon)

