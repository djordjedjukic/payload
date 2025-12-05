import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.join(__dirname, 'src')

// find all TypeScript/TSX files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList)
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

// calculate relative path from one file to another
function getRelativePath(from, to) {
  const fromDir = path.dirname(from)
  let relativePath = path.relative(fromDir, to)
  
  // ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath
  }
  
  // remove .ts or .tsx extension
  relativePath = relativePath.replace(/\.(ts|tsx)$/, '')
  
  return relativePath
}

// convert @/ import to relative import
function convertImport(filePath, importPath) {
  // remove @/ prefix
  const targetPath = importPath.replace(/^@\//, '')
  
  // resolve to absolute path
  const absoluteTarget = path.join(srcDir, targetPath)
  
  // check if it's a file or directory
  let resolvedTarget = absoluteTarget
  
  // try with .ts extension
  if (fs.existsSync(absoluteTarget + '.ts')) {
    resolvedTarget = absoluteTarget + '.ts'
  }
  // try with .tsx extension
  else if (fs.existsSync(absoluteTarget + '.tsx')) {
    resolvedTarget = absoluteTarget + '.tsx'
  }
  // try as directory with index.ts
  else if (fs.existsSync(path.join(absoluteTarget, 'index.ts'))) {
    resolvedTarget = path.join(absoluteTarget, 'index.ts')
  }
  // try as directory with index.tsx
  else if (fs.existsSync(path.join(absoluteTarget, 'index.tsx'))) {
    resolvedTarget = path.join(absoluteTarget, 'index.tsx')
  }
  // assume it's a directory
  else if (fs.existsSync(absoluteTarget) && fs.statSync(absoluteTarget).isDirectory()) {
    resolvedTarget = absoluteTarget
  }
  
  return getRelativePath(filePath, resolvedTarget)
}

// process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  
  // match import statements with @/ paths
  const importRegex = /from\s+['"]@\/([^'"]+)['"]/g
  
  content = content.replace(importRegex, (match, importPath) => {
    modified = true
    const relativePath = convertImport(filePath, '@/' + importPath)
    return `from '${relativePath}'`
  })
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✓ Fixed: ${path.relative(srcDir, filePath)}`)
    return 1
  }
  
  return 0
}

// main
console.log('Finding TypeScript files...')
const files = findFiles(srcDir)
console.log(`Found ${files.length} files\n`)

console.log('Converting @/ imports to relative imports...\n')
let fixedCount = 0

files.forEach(file => {
  fixedCount += processFile(file)
})

console.log(`\n✅ Done! Fixed ${fixedCount} files`)

