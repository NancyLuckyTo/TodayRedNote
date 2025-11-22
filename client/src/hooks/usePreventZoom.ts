import { useEffect } from 'react'

export const usePreventZoom = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
      ) {
        e.preventDefault()
      }
    }

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    const handleGestureStart = (e: Event) => {
      e.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown, { passive: false })
    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('gesturestart', handleGestureStart)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('gesturestart', handleGestureStart)
    }
  }, [])
}
