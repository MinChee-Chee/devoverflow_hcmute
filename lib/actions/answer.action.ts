"use server";

import Answer from "@/database/answer.model";
import { connectToDatabase } from "../mongoose";
import {
  AnswerVoteParams,
  CreateAnswerParams,
  DeleteAnswerParams,
  GetAnswersParams,
  GetManagerAnswersParams,
} from "./shared.types";
import Question from "@/database/question.model";
import { revalidatePath } from "next/cache";
import Interaction from "@/database/interaction.model";
import User from "@/database/user.model";
import { logActivity } from './activity.action';
import Reply from "@/database/reply.model";
import { detectAnswerSpam } from '../spam-detector';
import { escapeRegExp } from '../utils';


export async function createAnswer(params: CreateAnswerParams) {
  try {
    connectToDatabase();

    const { content, author, question, path } = params;

    // Run spam detection
    const spamDetection = detectAnswerSpam(content);

    const newAnswer = await Answer.create({ 
      content, 
      author, 
      question,
      isSpam: spamDetection.isSpam,
      spamScore: spamDetection.spamScore,
      spamReason: spamDetection.reason
    });

    // Add the answer to the question's answers array
    const questionObject = await Question.findByIdAndUpdate(question, {
      $push: { answers: newAnswer._id },
    });

    await Interaction.create({
      user: author,
      action: "answer",
      question,
      answer: newAnswer._id,
      tags: questionObject.tags,
    });

    await User.findByIdAndUpdate(author, { $inc: { reputation: 10 } });

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getAnswers(params: GetAnswersParams) {
  try {
    connectToDatabase();

    const { questionId, sortBy, page = 1, pageSize = 2 } = params;

    const skipAmount = (page - 1) * pageSize;

    let sortOptions = {};

    switch (sortBy) {
      case "highestUpvotes":
        sortOptions = { upvotes: -1 };
        break;
      case "lowestUpvotes":
        sortOptions = { upvotes: 1 };
        break;
      case "recent":
        sortOptions = { createdAt: -1 };
        break;
      case "old":
        sortOptions = { createdAt: 1 };
        break;
      default:
        break;
    }

    const answers = await Answer.find({ question: questionId })
      .populate("author", "_id clerkId name picture")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions);

    const totalAnswers = await Answer.countDocuments({ question: questionId });

    const isNextAnswer = totalAnswers > skipAmount + answers.length;

    return { answers, isNextAnswer };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getManagerAnswers(params: GetManagerAnswersParams) {
  try {
    connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    const skipAmount = (page - 1) * pageSize;

    let sortOptions = {};

    switch (filter) {
      case "recent":
        sortOptions = { createdAt: -1 };
        break;
      case "downvotedbyquestions":
        sortOptions = { downvotes: -1 };
        break;
      default:
        break;
    }

    const answers = await Answer.find()
      .populate("author", "_id clerkId name picture")
      .populate("question", "_id title")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions);

    // Filter in JavaScript after fetching and populating
    const filteredAnswers = searchQuery
      ? answers.filter(
          (answer) =>
            answer.author.name.match(new RegExp(escapeRegExp(searchQuery), "i")) ||
            answer.question.title.match(new RegExp(escapeRegExp(searchQuery), "i"))
        )
      : answers;

    const totalAnswers = await Answer.countDocuments();
    const isNextAnswer = totalAnswers > skipAmount + filteredAnswers.length;

    return { answers: filteredAnswers, isNextAnswer };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteAnswer(params: AnswerVoteParams) {
  try {
    connectToDatabase();

    const { answerId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasupVoted) {
      updateQuery = { $pull: { upvotes: userId } };
    } else if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId },
        $push: { upvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { upvotes: userId } };
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
      new: true,
    });

    if (!answer) {
      throw new Error("Answer not found");
    }

    if (userId !== answer.author.toString()) {
      // Increment author's reputation
      await User.findByIdAndUpdate(userId, {
        $inc: { reputation: hasupVoted ? -3 : 3 },
      });

      await User.findByIdAndUpdate(answer.author, {
        $inc: { reputation: hasupVoted ? -11 : 11 },
      });
    }

    // Log the activity
    const user = await User.findById(userId);
    if (user) {
      const answerDoc = await Answer.findById(answerId);
      const questionId = answerDoc?.question?.toString() || '';

      await logActivity({
        clerkId: user.clerkId,
        actionType: hasupVoted ? 'remove_upvote' : 'upvote',
        targetType: 'answer',
        targetId: questionId,
        answerId: answerId,
      });
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function downvoteAnswer(params: AnswerVoteParams) {
  try {
    connectToDatabase();

    const { answerId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasdownVoted) {
      updateQuery = { $pull: { downvotes: userId } };
    } else if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId },
        $push: { downvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { downvotes: userId } };
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
      new: true,
    });

    if (!answer) {
      throw new Error("Answer not found");
    }

    if (userId !== answer.author.toString()) {
      // Increment author's reputation
      await User.findByIdAndUpdate(userId, {
        $inc: { reputation: hasdownVoted ? -3 : 3 },
      });

      await User.findByIdAndUpdate(answer.author, {
        $inc: { reputation: hasdownVoted ? -11 : 11 },
      });
    }

    // Log the activity
    const user = await User.findById(userId);
    if (user) {
      const answerDoc = await Answer.findById(answerId);
      const questionId = answerDoc?.question?.toString() || '';

      await logActivity({
        clerkId: user.clerkId,
        actionType: hasdownVoted ? 'remove_downvote' : 'downvote',
        targetType: 'answer',
        targetId: questionId,
        answerId: answerId,
      });
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteAnswer(params: DeleteAnswerParams) {
  try {
    connectToDatabase();

    const { answerId, path } = params;

    const answer = await Answer.findById(answerId);

    if (!answer) {
      throw new Error("Answer not found");
    }

    // Delete all replies associated with this answer
    await Reply.deleteMany({ answer: answerId });

    // Delete the answer
    await answer.deleteOne({ _id: answerId });
    
    // Remove the answer reference from the question
    await Question.updateMany(
      { _id: answer.question },
      { $pull: { answers: answerId } }
    );

    // Delete all interactions related to this answer
    await Interaction.deleteMany({ answer: answerId });

    revalidatePath(path);
  } catch (error) {
    console.log(error);
  }
}

export async function getSpamAnswers(params: GetManagerAnswersParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    const skipAmount = (page - 1) * pageSize;

    // Only get answers flagged as spam
    const query = { isSpam: true };

    let sortOptions = {};

    switch (filter) {
      case "highest_score":
        sortOptions = { spamScore: -1 };
        break;
      case "recent":
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { spamScore: -1 };
        break;
    }

    const answers = await Answer.find(query)
      .populate("author", "_id clerkId name picture")
      .populate("question", "_id title")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions);

    // Filter in JavaScript after fetching and populating
    const filteredAnswers = searchQuery
      ? answers.filter(
          (answer) =>
            answer.author.name.match(new RegExp(escapeRegExp(searchQuery), "i")) ||
            answer.question.title.match(new RegExp(escapeRegExp(searchQuery), "i"))
        )
      : answers;

    const totalAnswers = await Answer.countDocuments(query);
    const isNextAnswer = totalAnswers > skipAmount + filteredAnswers.length;

    return { answers: filteredAnswers, isNextAnswer };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
