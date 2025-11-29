"use server"

import Answer from "@/database/answer.model";
import { connectToDatabase } from "../mongoose";
import { AnswerVoteParams, CreateAnswerParams, DeleteAnswerParams, GetAnswersParams } from "./shared.types";
import Question from "@/database/question.model";
import { revalidatePath } from "next/cache";
import Interaction from "@/database/interaction.model";
import User from "@/database/user.model";
import { notifyUserByClerkId } from "../push-notifications";

export async function createAnswer(params: CreateAnswerParams) {
  try {
    await connectToDatabase();

    const { content, author, question, path } = params;

    const newAnswer = await Answer.create({ content, author, question });
    
    // Add the answer to the question's answers array
    const questionObject = await Question.findByIdAndUpdate(
      question,
      {
        $push: { answers: newAnswer._id },
      },
      { new: true }
    )

    if (!questionObject) {
      throw new Error("Question not found while creating answer")
    }

    await Interaction.create({
      user: author,
      action: "answer",
      question,
      answer: newAnswer._id,
      tags: questionObject.tags
    })

    const answeringUser = await User.findByIdAndUpdate(
      author,
      { $inc: { reputation: 10 }},
      { new: true }
    );

    if (
      questionObject?.author &&
      questionObject.author.toString() !== author.toString()
    ) {
      const questionOwner = await User.findById(questionObject.author);

      // Send notification non-blocking - don't let notification failures affect answer creation
      notifyUserByClerkId({
        clerkId: questionOwner?.clerkId,
        title: `${answeringUser?.name ?? "Someone"} replied to your question`,
        body: `A new answer was just posted on "${questionObject.title}".`,
        path: `/question/${question}`,
        data: {
          type: "answer_created",
          questionId: question.toString(),
          answerId: newAnswer._id.toString(),
        },
      }).catch((error) => {
        // Log notification errors but don't throw - notifications are non-critical
        console.error("[Answer] Failed to send notification:", error);
      });
    }

    revalidatePath(path)
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getAnswers(params: GetAnswersParams) {
  try {
    await connectToDatabase();

    const { questionId, sortBy, page=1, pageSize=3 } = params;

    const skipAmount = (page - 1) * pageSize;

    let sortOptions = {};

    switch (sortBy) {
      case "highestUpvotes":
        sortOptions = { upvotes: -1 }
        break;
      case "lowestUpvotes":
        sortOptions = { upvotes: 1 }
        break;
      case "recent":
        sortOptions = { createdAt: -1 }
        break;
      case "old":
        sortOptions = { createdAt: 1 }
        break;
      default:
        break;
    }

    const answers = await Answer.find({ question: questionId })
      .populate("author", "_id clerkId name picture")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions)

    const totalAnswers = await Answer.countDocuments({ question: questionId });

    const isNextAnswer = totalAnswers > skipAmount + answers.length;

    return { answers, isNextAnswer };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteAnswer(params: AnswerVoteParams) {
  try {
    await connectToDatabase();

    const { answerId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if(hasupVoted) {
      updateQuery = { $pull: { upvotes: userId }}
    } else if (hasdownVoted) {
      updateQuery = { 
        $pull: { downvotes: userId },
        $push: { upvotes: userId }
      }
    } else {
      updateQuery = { $addToSet: { upvotes: userId }}
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, { new: true });

    if(!answer) {
      throw new Error("Answer not found");
    }

    if(userId !== answer.author.toString()){

    // Increment author's reputation
    await User.findByIdAndUpdate(userId, { $inc: { reputation: hasupVoted ? -3 : 3 }});

    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: hasupVoted ? -11 : 11 }});

    }
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function downvoteAnswer(params: AnswerVoteParams) {
  try {
    await connectToDatabase();

    const { answerId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if(hasdownVoted) {
      // Remove existing downvote
      updateQuery = { $pull: { downvotes: userId }}
    } else if (hasupVoted) {
      updateQuery = { 
        $pull: { upvotes: userId },
        $push: { downvotes: userId }
      }
    } else {
      updateQuery = { $addToSet: { downvotes: userId }}
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, { new: true });

    if(!answer) {
      throw new Error("Answer not found");
    }
    
    if(userId !== answer.author.toString()) {
    // Increment author's reputation
    await User.findByIdAndUpdate(userId, { $inc: { reputation: hasdownVoted ? -3 : 3 }});

    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: hasdownVoted ? -11 : 11 }});
    }
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteAnswer(params: DeleteAnswerParams) {
  try {
    await connectToDatabase();

    const { answerId, path } = params;

    const answer = await Answer.findById(answerId);

    if(!answer) {
      throw new Error("Answer not found");
    }

    await answer.deleteOne({ _id: answerId });
    await Question.updateMany({ _id: answer.question }, { $pull: { answers: answerId }});
    await Interaction.deleteMany({ answer: answerId });

    revalidatePath(path);
  } catch (error) {
    console.log(error);
  }
}
