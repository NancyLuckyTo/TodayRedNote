import type { IPost } from '@today-red-note/types'

export type PostsResponse = {
  posts: IPost[]
  pagination?: {
    nextCursor: string | null
    hasNextPage: boolean
    limit: number
  }
}
