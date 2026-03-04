import React, { useRef, useEffect } from 'react'
import { Node, NodeData } from '../../types'

interface NoteNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
}

export const NoteNode: React.FC<NoteNodeProps> = ({ node, updateNodeData }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
        }
    }, [node.data.prompt])

    return (
        <div className="flex flex-col h-full">
            <textarea
                ref={textareaRef}
                className="w-full min-h-[8rem] bg-amber-50/50 dark:bg-amber-900/10 border-none rounded-md p-3 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500 leading-relaxed resize-none focus:ring-1 focus:ring-amber-400 focus:outline-none overflow-hidden"
                placeholder="Write a note..."
                value={node.data.prompt}
                onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag start when clicking text area
                onWheel={(e) => {
                    /* Allow event to bubble for canvas zoom since note auto-expands */
                }}
            />
        </div>
    )
}
