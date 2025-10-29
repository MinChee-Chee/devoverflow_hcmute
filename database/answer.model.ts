import { Schema, models, model, Document } from 'mongoose';

export interface IAnswer extends Document {
    author: Schema.Types.ObjectId;
    question: Schema.Types.ObjectId;
    content: string;
    upvotes: Schema.Types.ObjectId[];
    downvotes: Schema.Types.ObjectId[];
    replies: Schema.Types.ObjectId[];
    createdAt: Date;
    isSpam: boolean;
    spamScore: number;
    spamReason?: string;
}

const AnswerSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    content: { type: String, required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    replies: [{ type: Schema.Types.ObjectId, ref: 'Reply' }],
    createdAt: { type: Date, default: Date.now },
    isSpam: { type: Boolean, default: false },
    spamScore: { type: Number, default: 0 },
    spamReason: { type: String }
})

const Answer = models.Answer || model('Answer', AnswerSchema);

export default Answer;