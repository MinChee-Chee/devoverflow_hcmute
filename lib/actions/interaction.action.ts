"use server"

import Question from "@/database/question.model";
import { connectToDatabase } from "../mongoose";
import { ViewQuestionParams } from "./shared.types";
import Interaction from "@/database/interaction.model";

export async function viewQuestion(params: ViewQuestionParams) {
  try {
    await connectToDatabase();

    const { questionId, userId } = params;

    let shouldIncrementView = true;

    if (userId) {
      const { upsertedCount } = await Interaction.updateOne(
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

      // Only increment if this is the user's first recorded view
      shouldIncrementView = upsertedCount > 0;
    }

    if (shouldIncrementView) {
      await Question.findByIdAndUpdate(questionId, { $inc: { views: 1 } });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Testing the increment of author's reputation (not stable || not working)
// This function may not be working as expected, as the increment of the author's reputation is not stable.
// It will be developed further in the future.