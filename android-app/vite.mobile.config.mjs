import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const tailwind = require('tailwindcss')
const autoprefixer = require('autoprefixer')
import { resolve } from 'node:path'
const deps=resolve('android-app/node_modules')
export default defineConfig({root:resolve('android-app/mobile-src'),base:'./',plugins:[react()],resolve:{alias:[{find:'@shared',replacement:resolve('src/shared')},{find:/^react-dom(\/.*)?$/,replacement:deps+'/react-dom$1'},{find:/^react(\/.*)?$/,replacement:deps+'/react$1'},{find:/^motion(\/.*)?$/,replacement:deps+'/motion$1'},{find:/^zustand(\/.*)?$/,replacement:deps+'/zustand$1'},{find:/^recharts(\/.*)?$/,replacement:deps+'/recharts$1'},{find:/^sql\.js(\/.*)?$/,replacement:deps+'/sql.js$1'},{find:/^@fontsource\/(.*)$/,replacement:deps+'/@fontsource/$1'}]},css:{postcss:{plugins:[tailwind({config:resolve('tailwind.config.cjs')}),autoprefixer()]}},build:{outDir:resolve('android-app/original-preview'),emptyOutDir:true}})
