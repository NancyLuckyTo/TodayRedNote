import { Navigate, useLocation } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

const PrivateRoute = ({ children }: PropsWithChildren) => {
  const location = useLocation()
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

export default PrivateRoute
