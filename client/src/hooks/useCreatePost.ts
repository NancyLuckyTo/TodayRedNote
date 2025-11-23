import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import api from '@/lib/api'
import { compressImages } from '@/lib/imageUtils'
import { IMAGE_QUALITY } from '@today-red-note/types'
import type { SelectedImage } from './useImageSelection'

export interface PostFormData {
  body: string
  bodyPreview?: string
  tags?: string
}

interface UseCreatePostProps {
  onSuccess?: () => void
}

export const useCreatePost = ({ onSuccess }: UseCreatePostProps = {}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      images,
    }: {
      data: PostFormData
      images: SelectedImage[]
    }) => {
      let uploadedImages: { url: string; width: number; height: number }[] = []

      if (images.length > 0) {
        try {
          const originalFiles = images.map(img => img.file)
          const compressedFiles = await compressImages(
            originalFiles,
            IMAGE_QUALITY.PREVIEW
          )

          const compressedImagesWithDims = await Promise.all(
            compressedFiles.map(async (compressedFile, idx) => {
              const originalImg = images[idx]
              let width = originalImg.width
              let height = originalImg.height

              if (width > 800) {
                const ratio = 800 / width
                width = 800
                height = Math.round(height * ratio)
              }

              return {
                file: compressedFile,
                width,
                height,
              }
            })
          )

          const reqBody = {
            files: compressedImagesWithDims.map(item => ({
              filename: item.file.name,
              contentType: item.file.type,
            })),
          }

          const batch = await api.post('/upload/request-urls', reqBody)
          const items: { uploadUrl: string; publicUrl: string }[] =
            batch.data.items

          await Promise.all(
            items.map((it, idx) =>
              axios.put(it.uploadUrl, compressedImagesWithDims[idx].file, {
                headers: {
                  'Content-Type': compressedImagesWithDims[idx].file.type,
                },
              })
            )
          )

          uploadedImages = items.map((it, idx) => ({
            url: it.publicUrl,
            width: compressedImagesWithDims[idx].width,
            height: compressedImagesWithDims[idx].height,
          }))
        } catch (error) {
          if (error instanceof Error && error.message.includes('压缩')) {
            throw error
          }
          if (axios.isAxiosError(error)) {
            const url = error.config?.url || ''
            if (/\/upload\/request-url(s)?/.test(String(url))) {
              throw new Error('获取上传授权失败')
            }
          }
          throw new Error('上传文件失败，请检查网络或重试')
        }
      }

      const tagsArray = data.tags
        ? data.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        : []

      const postRes = await api.post('/posts', {
        body: data.body,
        bodyPreview: data.bodyPreview,
        images: uploadedImages,
        tags: tagsArray,
      })

      return postRes.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('发布成功！')
      if (onSuccess) onSuccess()
      navigate('/')
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : '请稍后重试'
      toast.error('发布失败', {
        description: errorMessage,
      })
    },
  })
}
