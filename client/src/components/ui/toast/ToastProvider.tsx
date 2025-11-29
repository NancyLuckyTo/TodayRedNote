import { createPortal } from 'react-dom'
import { useToastStore } from '@/stores/toastStore'
import { Toast } from './Toast'
import { cn } from '@/lib/utils'

export type ToastPosition = 'top-left' | 'top-center' | 'top-right'

interface ToastProviderProps {
  position?: ToastPosition // Toast 显示位置
  maxVisible?: number // 最大同时显示数量
  className?: string // 容器类名
  offset?: number // 容器内边距
}

const positionStyles: Record<ToastPosition, string> = {
  'top-left': 'top-15 left-0 items-start',
  'top-center': 'top-15 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-15 right-0 items-end',
}

export const ToastProvider = ({
  position = 'top-right',
  maxVisible = 1,
  className,
  offset = 0,
}: ToastProviderProps) => {
  const toasts = useToastStore(state => state.toasts)

  // 只显示最新的 maxVisible 个
  const visibleToasts = toasts.slice(-maxVisible)

  // 根据位置决定排序方向
  const isBottom = position.startsWith('bottom')
  const orderedToasts = isBottom ? [...visibleToasts].reverse() : visibleToasts

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className={cn(
        'fixed z-9999 pointer-events-none flex flex-col gap-2',
        positionStyles[position],
        className
      )}
      style={{ padding: offset }}
      aria-live="polite"
      aria-label="通知"
    >
      {orderedToasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  )
}
