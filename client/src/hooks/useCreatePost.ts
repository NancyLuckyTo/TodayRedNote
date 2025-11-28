import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { uploadImages, parseTags, type PostFormData } from '@/lib/postUtils'
import type { SelectedImage } from './useImageSelection'

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
      existingImages = [],
    }: {
      data: PostFormData
      images: SelectedImage[]
      existingImages?: string[] // 草稿中已上传的图片 URL
    }) => {
      // 上传新图片
      const uploadedImages = await uploadImages(images)

      // 合并已有图片和新上传的图片
      const allImages = [
        ...existingImages.map(url => ({ url, width: 0, height: 0 })),
        ...uploadedImages,
      ]

      const postRes = await api.post('/posts', {
        body: data.body,
        bodyPreview: data.bodyPreview,
        images: allImages,
        tags: parseTags(data.tags),
      })

      return postRes.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('发布成功！')
      onSuccess?.()
      navigate('/')
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : '请稍后重试'
      toast.error('发布失败', { description: errorMessage })
    },
  })
}
