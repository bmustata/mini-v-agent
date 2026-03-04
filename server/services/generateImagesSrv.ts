import { Modality } from '@google/genai'
import sharp from 'sharp'
import { ai } from '../utils/const.ts'
import { enhancePrompt } from './promptSrv.ts'
import { validateModel, getModelConfig } from '../utils/modelUtils.ts'
import { isValidAspectRatio, getValidAspectRatios, isImagenModel } from '../utils/imageUtils.ts'
import { logger } from '../utils/logger.ts'
import { saveResource } from './resourcesSrv.ts'

export interface GenerateImagesOptions {
    prompt?: string
    count?: number
    referenceImages?: string[]
    aspectRatio?: string
    outputFormat?: string
    shouldEnhance?: boolean
    model?: string
    preset?: string
}

export interface GenerateImagesResult {
    images: string[]
    enhancedPrompt?: string
}

export interface GenerateImagesWithResourcesResult {
    imageResources: string[]
    enhancedPrompt?: string
}

/**
 * Parse base64 image data URL
 */
const parseImageDataUrl = (img: string): { mimeType: string; data: string } | null => {
    const match = img.match(/^data:(.*?);base64,(.*)$/)
    if (match) {
        return { mimeType: match[1], data: match[2] }
    }
    return null
}

/**
 * Build content parts from images and prompt
 */
const buildContentParts = (referenceImages: string[], promptToSend: string): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

    for (const img of referenceImages) {
        if (img) {
            const parsed = parseImageDataUrl(img)
            if (parsed) {
                parts.push({ inlineData: parsed })
            }
        }
    }

    if (promptToSend && promptToSend.trim()) {
        parts.push({ text: promptToSend })
    }

    return parts
}

/**
 * Normalize mime type to supported formats (png/jpeg)
 */
const normalizeMimeType = (mimeType?: string): 'image/png' | 'image/jpeg' => {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        return 'image/jpeg'
    }
    return 'image/png'
}

/**
 * Normalize output format string to 'png' or 'jpeg'
 */
const normalizeOutputFormat = (format?: string): 'png' | 'jpeg' | undefined => {
    if (!format) return undefined
    const lower = format.toLowerCase()
    if (lower === 'jpeg' || lower === 'jpg') return 'jpeg'
    if (lower === 'png') return 'png'
    return undefined
}

/**
 * Convert image to target format using sharp
 */
const convertImageFormat = async (base64Data: string, targetFormat: 'png' | 'jpeg'): Promise<string> => {
    const buffer = Buffer.from(base64Data, 'base64')
    const converted = await sharp(buffer).toFormat(targetFormat).toBuffer()
    return converted.toString('base64')
}

/**
 * Extract images from AI response
 * Supports png and jpeg output formats
 * Converts to target format if needed using sharp
 */
const extractImagesFromResponse = async (responses: Array<{ candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> }>, outputFormat?: string): Promise<string[]> => {
    const images: string[] = []
    const targetFormat = normalizeOutputFormat(outputFormat)

    for (const response of responses) {
        const candidates = response.candidates
        if (candidates) {
            for (const candidate of candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            const sourceMimeType = normalizeMimeType(part.inlineData.mimeType)
                            const sourceFormat = sourceMimeType === 'image/jpeg' ? 'jpeg' : 'png'

                            let finalData = part.inlineData.data
                            let finalMimeType = sourceMimeType

                            // Convert if target format differs from source
                            if (targetFormat && targetFormat !== sourceFormat) {
                                finalData = await convertImageFormat(part.inlineData.data, targetFormat)
                                finalMimeType = `image/${targetFormat}`
                            }

                            images.push(`data:${finalMimeType};base64,${finalData}`)
                        }
                    }
                }
            }
        }
    }

    return images
}

/**
 * Generate images using AI model
 * Returns base64 encoded images
 * @param options - Image generation options
 * @param options.prompt - Text prompt describing the desired image
 * @param options.count - Number of images to generate (default: 1)
 * @param options.referenceImages - Array of base64 encoded reference images
 * @param options.aspectRatio - Aspect ratio for generated images (e.g., '1:1', '16:9', '9:16', '4:3', '3:4')
 * @param options.outputFormat - Output format for the images ('png' or 'jpeg')
 * @param options.shouldEnhance - Whether to enhance the prompt using AI (default: false)
 * @param options.model - AI model to use for generation
 * @param options.preset - Image preset for gemini-3-pro-image-preview ('1K', '2K', '4K')
 * @returns Promise resolving to generated images and enhanced prompt (if applicable)
 * @throws Error if aspectRatio is invalid or no image data is generated
 */
export const generateImagesBase64 = async (options: GenerateImagesOptions): Promise<GenerateImagesResult> => {
    const { prompt = '', count = 1, referenceImages = [], aspectRatio, outputFormat, shouldEnhance, model, preset } = options

    // Validate aspectRatio if provided
    if (aspectRatio && !isValidAspectRatio(aspectRatio)) {
        const validRatios = getValidAspectRatios().join(', ')
        throw new Error(`Invalid aspect ratio: ${aspectRatio}. Valid values are: ${validRatios}`)
    }

    let finalPrompt = prompt
    let enhancedPromptText: string | undefined

    if (shouldEnhance && finalPrompt.trim()) {
        // Prompt enhancement always uses the default TEXT model (gemini-2.5-flash),
        // regardless of the image model selected — image models are not valid for text generation.
        enhancedPromptText = await enhancePrompt(finalPrompt, 'IMAGE')
        finalPrompt = enhancedPromptText
    }

    // Build prompt with modifiers
    const modifiers: string[] = []
    if (outputFormat) modifiers.push(`format ${outputFormat.toLowerCase()}`)

    let promptToSend = finalPrompt
    if (modifiers.length > 0) {
        promptToSend = `${finalPrompt} (${modifiers.join(', ')})`.trim()
    }

    const validatedModel = validateModel(model, 'IMAGE')

    let images: string[]

    if (isImagenModel(validatedModel)) {
        // Imagen API: ai.models.generateImages
        if (!promptToSend.trim()) {
            throw new Error('Prompt is required for Imagen models.')
        }
        if (referenceImages.length > 0) {
            logger.warn('Imagen models do not support image inputs — reference images will be ignored.')
        }

        const response = await ai.models.generateImages({
            model: validatedModel,
            prompt: promptToSend,
            config: {
                numberOfImages: count,
                ...(aspectRatio ? { aspectRatio } : {}),
                ...(preset ? { imageSize: preset } : {})
            }
        })

        const targetFormat = normalizeOutputFormat(outputFormat)
        images = []
        for (const generated of response.generatedImages ?? []) {
            const bytes = generated.image?.imageBytes
            if (!bytes) continue
            let base64 = typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('base64')
            let mimeType = 'image/png'
            if (targetFormat) {
                base64 = await convertImageFormat(base64, targetFormat)
                mimeType = `image/${targetFormat}`
            }
            images.push(`data:${mimeType};base64,${base64}`)
        }
    } else {
        // Gemini API: ai.models.generateContent with IMAGE modality
        const parts = buildContentParts(referenceImages, promptToSend)
        if (parts.length === 0) {
            throw new Error('Prompt or Reference Image is required.')
        }

        const promises = Array(count)
            .fill(null)
            .map(() => {
                const config: { aspectRatio?: string; imageSize?: string } = {}
                if (aspectRatio) config.aspectRatio = aspectRatio
                const modelConfig = getModelConfig(validatedModel, 'IMAGE')
                if (preset && modelConfig?.options && 'presets' in modelConfig.options) {
                    config.imageSize = preset
                }
                const imageConfig = Object.keys(config).length > 0 ? config : undefined
                return ai.models.generateContent({
                    model: validatedModel,
                    contents: { parts },
                    config: { responseModalities: [Modality.IMAGE], imageConfig }
                })
            })

        const responses = await Promise.all(promises)
        images = await extractImagesFromResponse(responses, outputFormat)
    }

    if (images.length === 0) {
        throw new Error('No image data found in response.')
    }

    return { images, enhancedPrompt: enhancedPromptText }
}

/**
 * Generate images and save them as resources.
 * Returns ResourceItem metadata for each saved image.
 * @param options - Image generation options
 * @param resourcesDir - Directory where resources are stored
 */
export const generateImages = async (options: GenerateImagesOptions, resourcesDir: string): Promise<GenerateImagesWithResourcesResult> => {
    const base64Result = await generateImagesBase64(options)

    const imageResources: string[] = []
    for (const dataUrl of base64Result.images) {
        const match = dataUrl.match(/^data:.*;base64,(.+)$/)
        if (match) {
            const buffer = Buffer.from(match[1], 'base64')
            const resource = await saveResource(resourcesDir, buffer)
            imageResources.push(resource.id)
        }
    }

    return { imageResources, enhancedPrompt: base64Result.enhancedPrompt }
}
