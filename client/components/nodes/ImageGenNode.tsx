import React, { useState, useEffect } from 'react'
import { Play, Loader2, Maximize2, Link as LinkIcon, Image as ImageIcon, Sparkles, Info, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { resourceToUrl } from '../../utils/imageUtils'

interface ImageGenNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    connectedInputImages?: string[]
    onExpand: (imageUrl: string) => void
    onRun: () => void
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const OUTPUT_FORMATS = ['PNG', 'JPEG']

export const ImageGenNode: React.FC<ImageGenNodeProps> = ({ node, updateNodeData, connectedInputText, connectedInputImages = [], onExpand, onRun }) => {
    const { prompt, imageResources, isLoading, error, imageCount = 1, aspectRatio = '1:1', outputFormat = 'PNG', enhancePrompt, enhancedOutput, model, preset } = node.data
    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; options: any }>>([])
    const [modelsLoading, setModelsLoading] = useState(true)
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
    const [inputThumbError, setInputThumbError] = useState(false)

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await getModels()
                setAvailableModels(response.models.IMAGE)
            } catch (error) {
                console.error('Failed to fetch models:', error)
                toast.error('Failed to load models')
            } finally {
                setModelsLoading(false)
            }
        }
        fetchModels()
    }, [])

    // Reset input thumb error when connected image changes
    useEffect(() => {
        setInputThumbError(false)
    }, [connectedInputImages[0]])

    const isLinkedText = !!connectedInputText
    const hasImages = connectedInputImages.length > 0
    const canRun = !!prompt.trim() || isLinkedText || hasImages
    const handleWheel = (e: React.WheelEvent) => {
        const target = e.currentTarget as HTMLElement
        if (target.scrollHeight > target.clientHeight) {
            e.stopPropagation()
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Model Selector */}
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Model</label>
                <select
                    value={model || ''}
                    onChange={(e) => {
                        const selectedModel = availableModels.find((m) => m.model === e.target.value)
                        const updates: any = { model: e.target.value || undefined }
                        // Auto-select first preset if model supports presets
                        if (selectedModel?.options?.presets && selectedModel.options.presets.length > 0) {
                            updates.preset = selectedModel.options.presets[0]
                        } else {
                            updates.preset = undefined
                        }
                        updateNodeData(node.id, updates)
                    }}
                    disabled={modelsLoading}
                    className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                >
                    <option value="">Default</option>
                    {availableModels.map((m) => (
                        <option key={m.model} value={m.model}>
                            {m.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Preset Selector - Only show if model has presets */}
            {(() => {
                const selectedModel = availableModels.find((m) => m.model === model)
                const presets = selectedModel?.options?.presets
                if (!presets || presets.length === 0) return null

                return (
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Preset</label>
                        <select
                            value={preset || presets[0]}
                            onChange={(e) => updateNodeData(node.id, { preset: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                            {presets.map((p: string) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                )
            })()}

            {/* Prompt Input Section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase block">{isLinkedText ? 'Prompt & Context' : 'Prompt'}</label>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateNodeData(node.id, { enhancePrompt: !enhancePrompt })}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200 border ${enhancePrompt ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'}`}
                            title={enhancePrompt ? 'Disable Prompt Enhancement' : 'Enable Prompt Enhancement'}
                        >
                            <Sparkles size={10} fill={enhancePrompt ? 'currentColor' : 'none'} />
                            {enhancePrompt ? 'Enhanced' : 'Enhance'}
                        </button>
                        {isLinkedText && <LinkIcon size={12} className="text-indigo-500" />}
                    </div>
                </div>

                {isLinkedText && (
                    <div
                        className="w-full text-xs p-2 mb-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar relative group"
                        onWheel={handleWheel}
                    >
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-100 dark:bg-indigo-900 text-[9px] px-1 rounded text-indigo-500">CONTEXT</div>"{connectedInputText}"
                    </div>
                )}

                <textarea
                    className="w-full text-sm p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[80px] placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                    rows={isLinkedText ? 3 : 6}
                    value={prompt}
                    onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                    onWheel={handleWheel}
                    placeholder={isLinkedText ? 'Add details to the context...' : 'Describe the image...'}
                />

                {enhancePrompt && enhancedOutput && (
                    <div className="text-[10px] p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="font-bold opacity-80 block mb-1 flex items-center gap-1">
                            <Sparkles size={10} /> Enhanced Prompt Used:
                        </span>
                        <p className="italic leading-relaxed opacity-90">{enhancedOutput}</p>
                    </div>
                )}
            </div>

            {/* Image Input Status Section */}
            <div className="flex items-center gap-2">
                <div
                    className={`w-10 h-10 rounded-md flex items-center justify-center border relative overflow-hidden ${hasImages ? 'bg-pink-100 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700' : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}
                >
                    {hasImages ? (
                        <>
                            {inputThumbError ? (
                                <ImageOff size={14} className="text-pink-400" />
                            ) : (
                                <img src={connectedInputImages[0]} alt="Input" className="w-full h-full object-cover rounded-md" onError={() => setInputThumbError(true)} />
                            )}
                            {connectedInputImages.length > 1 && <div className="absolute bottom-0 right-0 bg-pink-500 text-white text-[8px] font-bold px-1 rounded-tl-md">+{connectedInputImages.length - 1}</div>}
                        </>
                    ) : (
                        <ImageIcon size={18} className="text-slate-400 dark:text-zinc-600" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">Image Input</span>
                    <span className={`text-[10px] ${hasImages ? 'text-pink-500' : 'text-slate-400 italic'}`}>{hasImages ? `${connectedInputImages.length} Connected` : 'Empty'}</span>
                </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-2 gap-2">
                {/* Aspect Ratio */}
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Ratio</label>
                    <select
                        value={aspectRatio}
                        onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
                        className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                        {ASPECT_RATIOS.map((ratio) => (
                            <option key={ratio} value={ratio}>
                                {ratio}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Output Format */}
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Format</label>
                    <select
                        value={outputFormat}
                        onChange={(e) => updateNodeData(node.id, { outputFormat: e.target.value })}
                        className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                        {OUTPUT_FORMATS.map((fmt) => (
                            <option key={fmt} value={fmt}>
                                {fmt}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Count Config */}
            <div className="flex items-center justify-between mt-1">
                <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Count</label>
                <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-md">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => updateNodeData(node.id, { imageCount: num })}
                            className={`
                w-6 h-6 flex items-center justify-center text-xs font-bold rounded
                transition-all
                ${imageCount === num ? 'bg-white dark:bg-zinc-600 text-purple-600 dark:text-purple-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'}
              `}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={onRun}
                disabled={isLoading || !canRun}
                className="flex items-center justify-center gap-2 w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Generate
            </button>

            {error && <div className="text-xs p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md">{error}</div>}

            {imageResources && imageResources.length > 0 && !isLoading && (
                <div className="space-y-2">
                    {/* Metadata Info Bar */}
                    <div className="flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/10 rounded-md border border-purple-200 dark:border-purple-900/30">
                        <div className="flex items-center gap-1.5 text-[10px] text-purple-600 dark:text-purple-400">
                            <Info size={10} />
                            <span className="font-semibold">
                                {imageResources.length} image{imageResources.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Image Grid */}
                    <div className={`grid gap-2 ${imageResources.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {imageResources.map((item, idx) => {
                            const imgUrl = resourceToUrl(item)
                            const hasError = imgErrors[item]
                            return (
                                <div
                                    key={item}
                                    className={`relative group w-full ${imageResources.length === 1 ? 'h-48' : 'h-28'} bg-slate-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 flex items-center justify-center`}
                                >
                                    {hasError ? (
                                        <div className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-zinc-600">
                                            <ImageOff size={20} />
                                            <span className="text-[9px]">Not available</span>
                                        </div>
                                    ) : (
                                        <img src={imgUrl} alt={`Generated output ${idx + 1}`} className="w-full h-full object-cover" onError={() => setImgErrors((prev) => ({ ...prev, [item]: true }))} />
                                    )}
                                    {!hasError && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => onExpand(imgUrl)} className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/40 text-white transition-colors">
                                                <Maximize2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                    {/* Visual indicator aligning with output handle */}
                                    <div
                                        className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500/50 rounded-l-full blur-[2px] transition-opacity ${imageResources.length > 1 && idx % 2 === 0 ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
