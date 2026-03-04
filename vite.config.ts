import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    return {
        root: './client',
        base: '/',
        server: {
            port: 3202,
            host: '0.0.0.0',
            proxy: {
                '/api': {
                    target: 'http://localhost:3201',
                    changeOrigin: true
                }
            }
        },
        plugins: [react()],
        define: {},
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './client')
            }
        },
        build: {
            outDir: '../dist'
        }
    }
})
