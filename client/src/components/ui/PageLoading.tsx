import { Spinner } from './spinner'

/**
 * 页面级加载占位组件
 * 用于 Suspense fallback，显示全屏居中的加载动画
 */
export function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}
