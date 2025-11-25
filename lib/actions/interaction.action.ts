"use server"

import Question from "@/database/question.model";
import { connectToDatabase } from "../mongoose";
import { ViewQuestionParams } from "./shared.types";
import Interaction from "@/database/interaction.model";

export async function viewQuestion(params: ViewQuestionParams) {
  try {
    await connectToDatabase();

    const { questionId, userId } = params;

    // Always increment the question views, regardless of user state
    await Question.findByIdAndUpdate(questionId, { $inc: { views: 1 } });

    if (userId) {
      await Interaction.updateOne(
        {
          user: userId,
          action: "view",
          question: questionId,
        },
        {
          $setOnInsert: {
            user: userId,
            action: "view",
            question: questionId,
          },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Testing the increment of author's reputation
// This function may not be working as expected, as the increment of the author's reputation is not stable.
// It will be developed further in the future.