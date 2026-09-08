import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = path.resolve(backendRoot, '..')

config({ path: path.join(projectRoot, '.env') })
config({ path: path.join(backendRoot, '.env'), override: true })
