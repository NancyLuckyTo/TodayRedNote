import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { SelectedImage } from '@/hooks/useImageSelection'

interface ImageUploaderProps {
  images: SelectedImage[]
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  triggerAdd: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  disabled?: boolean
  maxCount?: number
}

export const ImageUploader = ({
  images,
  onFilesSelected,
  onRemove,
  triggerAdd,
  fileInputRef,
  disabled = false,
  maxCount = 18,
}: ImageUploaderProps) => {
  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onFilesSelected}
        className="hidden"
        disabled={disabled}
      />

      <div className="grid grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative w-full aspect-square overflow-hidden rounded-md"
          >
            <img
              src={img.previewUrl}
              alt={`选中图片${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              disabled={disabled}
              className="absolute top-1 right-1 bg-black/20 text-white rounded-full p-1 hover:bg-black/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {images.length < maxCount && (
          <button
            type="button"
            onClick={triggerAdd}
            disabled={disabled}
            className="w-full aspect-square bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-12 h-12 text-gray-300" />
          </button>
        )}
      </div>
    </div>
  )
}
