import React, { useState, useEffect } from 'react'
import { Canvas } from './components/Canvas'
import { Toaster } from 'sonner'

const App: React.FC = () => {
    // Initialize theme based on system preference
    const [isDark, setIsDark] = useState(() => {
        // Check if user prefers dark mode via system settings
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true
        }
        return false // Default to light if no preference or preference is light
    })

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    const toggleTheme = () => setIsDark(!isDark)

    return (
        <div className="w-full h-full">
            <Canvas isDark={isDark} toggleTheme={toggleTheme} />
            <Toaster richColors position="top-center" />
        </div>
    )
}

export default App
