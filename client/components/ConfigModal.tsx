import React from 'react'
import { X, Copy, Check, Activity, Type, Image as ImageIcon, Share2, StickyNote, Box, ScanEye } from 'lucide-react'
import { toast } from 'sonner'
import { Node, Edge, NodeType } from '../types'

interface ConfigModalProps {
    isOpen: boolean
    onClose: () => void
    nodes: Node[]
    edges: Edge[]
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, nodes, edges }) => {
    const [copied, setCopied] = React.useState(false)

    if (!isOpen) return null

    // Filter out heavy data (images, results) to just show config params
    const configData = {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: {
                prompt: n.data.prompt,
                imageCount: n.data.imageCount,
                aspectRatio: n.data.aspectRatio,
                outputFormat: n.data.outputFormat,
                imageInputType: n.data.imageInputType,
                // Don't include base64 image input as it's too large
                imageInput: n.data.imageInput && n.data.imageInput.length < 1000 ? n.data.imageInput : undefined
            }
        })),
        edges: edges
    }

    const jsonString = JSON.stringify(configData, null, 2)

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Copied to clipboard!', {
            description: 'Graph configuration JSON copied'
        })
    }

    // Stats
    const textGenCount = nodes.filter((n) => n.type === NodeType.TEXT_GEN).length
    const imageGenCount = nodes.filter((n) => n.type === NodeType.IMAGE_GEN).length
    const imageSourceCount = nodes.filter((n) => n.type === NodeType.IMAGE_SOURCE).length
    const imageToTextCount = nodes.filter((n) => n.type === NodeType.IMAGE_TO_TEXT).length
    const noteCount = nodes.filter((n) => n.type === NodeType.NOTE).length
    const totalNodes = nodes.length
    const totalEdges = edges.length

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onWheel={(e) => e.stopPropagation()}>
            <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-slate-200 dark:border-zinc-700 flex flex-col h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-700 shrink-0">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 flex items-center gap-2">
                        <Code size={16} />
                        Graph Configuration
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors">
                        <X size={18} className="text-slate-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-5 gap-px bg-slate-200 dark:bg-zinc-800 shrink-0 border-b border-slate-200 dark:border-zinc-700">
                    <div className="bg-slate-200 dark:bg-zinc-950 p-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200 font-semibold">
                            <Activity size={14} className="text-indigo-500" />
                            {totalNodes}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-900 p-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Text Gen</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200 font-semibold">
                            <Type size={14} className="text-emerald-500" />
                            {textGenCount}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-900 p-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Image Gen</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200 font-semibold">
                            <ImageIcon size={14} className="text-purple-500" />
                            {imageGenCount}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-900 p-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Source</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200 font-semibold">
                            <Box size={14} className="text-cyan-500" />
                            {imageSourceCount}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-900 p-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Vision</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200 font-semibold">
                            <ScanEye size={14} className="text-blue-500" />
                            {imageToTextCount}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative flex-1 min-h-0 bg-slate-50 dark:bg-black/50">
                    <button
                        onClick={handleCopy}
                        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-500 dark:text-zinc-400" />}
                        <span className={copied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-300'}>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>

                    <div className="h-full overflow-auto p-4 custom-scrollbar">
                        <pre className="text-xs font-mono leading-relaxed text-slate-700 dark:text-zinc-400 whitespace-pre-wrap break-words">{jsonString}</pre>
                    </div>
                </div>

                <div className="p-3 text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50 rounded-b-lg shrink-0">
                    This JSON contains only parameters and connections. Generated outputs are excluded.
                </div>
            </div>
        </div>
    )
}

function Code({ size, className }: { size: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    )
}
