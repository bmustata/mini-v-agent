import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, FileText, Code } from 'lucide-react'
import { toast } from 'sonner'

interface TextPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    text: string
    title?: string
}

export const TextPreviewModal: React.FC<TextPreviewModalProps> = ({ isOpen, onClose, text, title = 'Text Result Preview' }) => {
    const [previewMode, setPreviewMode] = useState<'text' | 'markdown'>('markdown')

    if (!isOpen || !text) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard!')
    }

    const renderMarkdown = (content: string) => {
        return content
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-zinc-700 rounded text-sm">$1</code>')
            .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
            .replace(/\n\n/g, '<br/><br/>')
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onWheel={(e) => e.stopPropagation()}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-[90vw] max-w-5xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 flex flex-col h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-700 shrink-0">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">{title}</h2>
                    <div className="flex items-center gap-4">
                        {/* Toggle buttons */}
                        <div className="flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-1">
                            <button
                                onClick={() => setPreviewMode('text')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${
                                    previewMode === 'text' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                                }`}
                            >
                                <Code size={14} /> Text
                            </button>
                            <button
                                onClick={() => setPreviewMode('markdown')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${
                                    previewMode === 'markdown' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                                }`}
                            >
                                <FileText size={14} /> Markdown
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={20} className="text-slate-500 dark:text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 bg-slate-50 dark:bg-black/50 custom-scrollbar">
                    {previewMode === 'text' ? (
                        <pre className="text-sm font-mono text-slate-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{text}</pre>
                    ) : (
                        <div className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-zinc-700 shrink-0">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
                    >
                        <Copy size={14} />
                        Copy Text
                    </button>
                    <button onClick={onClose} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
