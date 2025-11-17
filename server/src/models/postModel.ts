import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IPost extends Document {
  author: Types.ObjectId // 作者 ID
  body: string
  coverImage: string // 封面图
  tags: string[] // 标签列表
  createdAt: Date
  updatedAt: Date
}

const PostSchema: Schema<IPost> = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    coverImage: { type: String, default: '' },
    tags: { type: [String], index: true, default: [] },
  },
  { timestamps: true }
)

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)

export default Post
