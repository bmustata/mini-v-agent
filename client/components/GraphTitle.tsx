import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Edit2, Copy, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface GraphTitleProps {
    graphName: string | undefined
    graphSource?: string
    onRename?: (newName: string) => void
    onDuplicate?: () => void
    onDelete?: () => void
}

export const GraphTitle: React.FC<GraphTitleProps> = ({ graphName, graphSource, onRename, onDuplicate, onDelete }) => {
    const [showDropdown, setShowDropdown] = useState(false)
    const [showRenameModal, setShowRenameModal] = useState(false)
    const [editValue, setEditValue] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const displayName = graphName || 'Untitled'

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showDropdown])

    // Focus input when modal opens
    useEffect(() => {
        if (showRenameModal && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [showRenameModal])

    const handleRenameClick = () => {
        setEditValue(displayName)
        setShowRenameModal(true)
        setShowDropdown(false)
    }

    const handleRenameSubmit = () => {
        if (editValue.trim() && editValue !== displayName && onRename) {
            onRename(editValue.trim())
        }
        setShowRenameModal(false)
    }

    const handleRenameCancel = () => {
        setShowRenameModal(false)
        setEditValue('')
    }

    return (
        <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto" ref={dropdownRef}>
                <div className="relative">
                    {/* Title Button */}
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900 transition-colors"
                    >
                        <span className="text-slate-900 dark:text-zinc-100 font-medium">{displayName}</span>
                        <ChevronDown size={16} className={`text-slate-500 dark:text-zinc-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {onRename && (
                                <button onClick={handleRenameClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                                    <Edit2 size={16} />
                                    <span>Rename</span>
                                </button>
                            )}

                            {onDuplicate && (
                                <button
                                    onClick={() => {
                                        onDuplicate()
                                        setShowDropdown(false)
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <Copy size={16} />
                                    <span>Duplicate</span>
                                </button>
                            )}

                            {onDelete && (
                                <>
                                    <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />
                                    <button
                                        onClick={() => {
                                            onDelete()
                                            setShowDropdown(false)
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span>Delete</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Rename Modal */}
            {showRenameModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-700">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Rename project</h2>
                            <button onClick={handleRenameCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-6">
                            <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit()
                                    if (e.key === 'Escape') handleRenameCancel()
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                placeholder="Enter project name"
                            />
                            {graphSource && (
                                <div className="mt-4">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">Source (local)</label>
                                    <input
                                        type="text"
                                        value={graphSource}
                                        readOnly
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 cursor-not-allowed"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-zinc-700">
                            <button onClick={handleRenameCancel} className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameSubmit}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
