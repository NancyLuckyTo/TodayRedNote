import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Editor } from '@tiptap/react'
import type { IPost } from '@today-red-note/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'
import {
  useImageSelection,
  type SelectedImage,
} from '@/hooks/useImageSelection'
import { useUpdatePost } from '@/hooks/useUpdatePost'
import {
  RichTextEditor,
  type RichTextEditorRef,
} from '@/components/create-post/RichTextEditor'
import { RichTextToolbar } from '@/components/create-post/RichTextToolbar'
import { useKeyboardPosition } from '@/hooks/useKeyboardPosition'
import { htmlToText, postSchema, type PostFormData } from '@/lib/postUtils'
import api from '@/lib/api'
import {
  BODY_MAX_LENGTH,
  BODY_PREVIEW_MAX_LENGTH,
  MAX_IMAGES_COUNT,
} from '@/constants/post'

const EditPostPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const editorRef = useRef<RichTextEditorRef>(null)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const { isKeyboardVisible, keyboardHeight } = useKeyboardPosition()

  // 已有图片 URL 列表
  const [existingImages, setExistingImages] = useState<string[]>([])
  // 帖子加载状态
  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<IPost | null>(null)

  // 新上传的图片
  const {
    images: newImages,
    fileInputRef,
    handleFilesSelected,
    removeImageAt: removeNewImageAt,
    resetImages,
    triggerFileInput,
  } = useImageSelection()

  const { mutate: updatePost, isPending } = useUpdatePost({
    onSuccess: () => {
      resetImages()
      setEditorContent('')
    },
  })

  // 加载帖子数据
  useEffect(() => {
    const loadPost = async () => {
      // 优先从路由 state 获取
      const statePost = (location.state as { post?: IPost } | null)?.post
      if (statePost && statePost._id === id) {
        setPost(statePost)
        setEditorContent(statePost.body)
        setExistingImages(statePost.images || [])
        setLoading(false)
        return
      }

      // 否则从 API 加载
      if (!id) {
        navigate('/')
        return
      }

      try {
        const { data } = await api.get<{ post: IPost }>(`/posts/${id}`)
        setPost(data.post)
        setEditorContent(data.post.body)
        setExistingImages(data.post.images || [])
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [id, location.state, navigate])

  const handleEditorRef = (ref: RichTextEditorRef | null) => {
    editorRef.current = ref
    setEditorInstance(ref?.editor ?? null)
  }

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { body: '', tags: '' },
  })

  // 当帖子加载后更新表单默认值
  useEffect(() => {
    if (post) {
      form.reset({
        body: post.body,
        tags: post.tags?.map(t => t.name).join(', ') || '',
      })
    }
  }, [post, form])

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (data: PostFormData) => {
    if (!id) return
    const textContent = htmlToText(editorContent)
    if (textContent.trim().length === 0) {
      form.setError('body', { message: '请输入内容' })
      return
    }
    if (textContent.length > BODY_MAX_LENGTH) {
      form.setError('body', { message: `内容不能超过${BODY_MAX_LENGTH}字` })
      return
    }

    updatePost({
      postId: id,
      data: {
        ...data,
        body: editorContent,
        bodyPreview: textContent.substring(0, BODY_PREVIEW_MAX_LENGTH),
      },
      images: newImages,
      existingImages,
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const totalImagesCount = existingImages.length + newImages.length
  const canAddMore = totalImagesCount < MAX_IMAGES_COUNT

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(-1)}
          disabled={isPending}
        >
          取消
        </Button>
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="redButton"
            form="edit-post-form"
            disabled={isPending}
          >
            {isPending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="p-4">
        <Form {...form}>
          <form
            id="edit-post-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* 正文 - 富文本编辑器 */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="border-none">
                      <RichTextEditor
                        ref={handleEditorRef}
                        content={editorContent}
                        onChange={content => {
                          setEditorContent(content)
                          field.onChange(content)
                        }}
                        placeholder="分享你的想法"
                        disabled={isPending}
                        className="min-h-[120px]"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 图片区域 */}
            <div className="space-y-4">
              {/* 已有图片和新上传图片的预览 */}
              {(existingImages.length > 0 || newImages.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {/* 已有图片 */}
                  {existingImages.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <img
                        src={url}
                        alt={`已有图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        disabled={isPending}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* 新上传的图片 */}
                  {newImages.map((img: SelectedImage, index: number) => (
                    <div
                      key={`new-${index}`}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`新图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImageAt(index)}
                        disabled={isPending}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* 添加更多按钮 */}
                  {canAddMore && (
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={isPending}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted disabled:opacity-50"
                    >
                      <Plus className="h-8 w-8" />
                    </button>
                  )}
                </div>
              )}

              {/* 空状态时的添加按钮 */}
              {existingImages.length === 0 && newImages.length === 0 && (
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={isPending}
                  className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm">添加图片</span>
                  </div>
                </button>
              )}

              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>
          </form>
        </Form>
      </div>

      {/* 富文本功能栏 */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out safe-area-inset-bottom"
        style={{
          transform:
            isKeyboardVisible && keyboardHeight > 0
              ? `translateY(-${keyboardHeight}px)`
              : 'translateY(0)',
        }}
      >
        <RichTextToolbar editor={editorInstance} />
      </div>
    </div>
  )
}

export default EditPostPage
