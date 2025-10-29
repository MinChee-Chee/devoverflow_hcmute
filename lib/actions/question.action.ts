"use server"

import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import { connectToDatabase } from "../mongoose"
import { CreateQuestionParams, DeleteQuestionParams, EditQuestionParams, GetManagerQuestionsParams, GetQuestionByIdParams, GetQuestionsParams, QuestionVoteParams, RecommendedParams } from "./shared.types";
import User from "@/database/user.model";
import { revalidatePath } from "next/cache";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import { FilterQuery } from "mongoose";
import { logActivity } from './activity.action';
import { detectSpam } from '../spam-detector';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getQuestions(params: GetQuestionsParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page =1, pageSize=10 } = params;

    const skipAmount = (page - 1)* pageSize;

    const query: FilterQuery<typeof Question> = {};

    if(searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") }},
        { content: { $regex: new RegExp(searchQuery, "i") }},
      ]
    }

    let sortOptions = {};

    switch (filter) {
      case "newest":
        sortOptions = { createdAt: -1 }
        break;
      case "frequent":
        sortOptions = { views: -1 }
        break;
      case "unanswered":
        query.answers = { $size: 0 }
        break;
      default:
        break;
    }

    const questions = await Question.find(query)
      .populate({ path: 'tags', model: Tag })
      .populate({ path: 'author', model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions)

      const totalQuestions = await Question.countDocuments(query);

      const isNext = totalQuestions > skipAmount + questions.length;

    return { questions, isNext };
  } catch (error) {
    console.log(error)
    throw error;
  }
}

export async function getManagerQuestionsParams(params: GetManagerQuestionsParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    const skipAmount = (page - 1) * pageSize;

    const query: FilterQuery<typeof Question> = {};

    let sortOptions = {};

    switch (filter) {
      case "most_recent":
        sortOptions = { createdAt: -1 };
        break;
      case "unfrequent":
        sortOptions = { views: +1 };
        break;
      case "downvoted":
        sortOptions = { downvotes: -1 };
        break;
      default:
        break;
    }

    const questions = await Question.find(query)
      .populate({ path: 'tags', model: Tag })
      .populate({ path: 'author', model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions);

      const filteredQuestions = searchQuery
    ? questions.filter(
      (question) =>
        question.author.name.match(new RegExp(searchQuery, "i")) ||
        question.title.match(new RegExp(searchQuery, "i"))
    ) 
    : questions;

    const totalQuestions = await Question.countDocuments(query);

    const isNextQuestions = totalQuestions > skipAmount + questions.length;

    return { questions: filteredQuestions, isNextQuestions };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function createQuestion(params: CreateQuestionParams) {
  try {
    connectToDatabase();

    const { title, content, tags, author, path } = params;

    // Run spam detection
    const spamDetection = detectSpam(title, content);

    // Create the question
    const question = await Question.create({
      title,
      content,
      author,
      isSpam: spamDetection.isSpam,
      spamScore: spamDetection.spamScore,
      spamReason: spamDetection.reason
    });

    const tagDocuments = [];

    // Create the tags or get them if they already exist
    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, "i") } }, 
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      )

      tagDocuments.push(existingTag._id);
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments }}
    });

    // Create an interaction record for the user's ask_question action
      await Interaction.create({
        user: author,
        question: question._id,
        action: "ask_question",
        tags: tagDocuments,
      })


    // Increment author's reputation by +5 for creating a question(done)
      await User.findByIdAndUpdate(author, { $inc: { reputation: 7 }});
    // Try to increase the reputation of author when adding new tags to new questions (Not implement yet)

    revalidatePath(path)
  } catch (error) {
    console.log(error);
  }
}

export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    connectToDatabase();

    const { questionId } = params;

    const question = await Question.findById(questionId)
      .populate({ path: 'tags', model: Tag, select: '_id name'})
      .populate({ path: 'author', model: User, select: '_id clerkId name picture'})

      return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDatabase();

    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

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

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, { new: true });

    if(!question) {
      throw new Error("Question not found");
    }
    
    if(userId !== question.author.toString()) {
      // Increment author's reputation
      await User.findByIdAndUpdate(userId, { $inc: { reputation: hasupVoted ? -2 : 2 }});
      // Increment author's reputation
      await User.findByIdAndUpdate(question.author, { $inc: { reputation: hasupVoted ? -9 : 9 }});
    }

    // Log the activity
    const user = await User.findById(userId);
    if (user) {
      await logActivity({
        clerkId: user.clerkId,
        actionType: hasupVoted ? 'remove_upvote' : 'upvote',
        targetType: 'question',
        targetId: questionId,
      });
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function downvoteQuestion(params: QuestionVoteParams) {
  try {
    connectToDatabase();

    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if(hasdownVoted) {
      updateQuery = { $pull: { downvotes: userId }}
    } else if (hasupVoted) {
      updateQuery = { 
        $pull: { upvotes: userId },
        $push: { downvotes: userId }
      }
    } else {
      updateQuery = { $addToSet: { downvotes: userId }}
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, { new: true });

    if(!question) {
      throw new Error("Question not found");
    }

    if(userId !== question.author.toString()) {
      // Increment author's reputation
      await User.findByIdAndUpdate(userId, { $inc: { reputation: hasdownVoted ? -2 : 2 }});
      await User.findByIdAndUpdate(question.author, { $inc: { reputation: hasdownVoted ? -9 : 9 }});
    }

    // Log the activity
    const user = await User.findById(userId);
    if (user) {
      await logActivity({
        clerkId: user.clerkId,
        actionType: hasdownVoted ? 'remove_downvote' : 'downvote',
        targetType: 'question',
        targetId: questionId,
      });
    }

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteQuestion(params: DeleteQuestionParams) {
  try {
    connectToDatabase();

    const { questionId, path } = params;

    const question = await Question.findById(questionId);

    const author = question.author;

    await Question.deleteOne({ _id: questionId });
    await Answer.deleteMany({ question: questionId });
    await Interaction.deleteMany({ question: questionId });
    await Tag.updateMany({ questions: questionId }, { $pull: { questions: questionId }});

    await User.findByIdAndUpdate(author,   { $inc: { reputation: -7 }});

    revalidatePath(path);
  } catch (error) {
    console.log(error);
  }
}

export async function editQuestion(params: EditQuestionParams) {
  try {
    connectToDatabase();

    const { questionId, title, content, path } = params;

    const question = await Question.findById(questionId).populate("tags");

    if(!question) {
      throw new Error("Question not found");
    }

    question.title = title;
    question.content = content;

    await question.save();

    revalidatePath(path);
  } catch (error) {
    console.log(error);
  }
}

export async function getHotQuestions() {
  try {
    connectToDatabase();

    const hotQuestions = await Question.find({})
      .sort({ views: -1, upvotes: -1 }) 
      .limit(6);

      return hotQuestions;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getRecommendedQuestions(params: RecommendedParams) {
  try {
    await connectToDatabase();

    const { userId, page = 1, pageSize = 20, searchQuery } = params;

    // find user
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      throw new Error("user not found");
    }

    const skipAmount = (page - 1) * pageSize;

    // Find the user's interactions
    const userInteractions = await Interaction.find({ user: user._id })
      .populate("tags")
      .exec();

    // Extract tags from user's interactions
    const userTags = userInteractions.reduce((tags, interaction) => {
      if (interaction.tags) {
        tags = tags.concat(interaction.tags);
      }
      return tags;
    }, []);

    // Get distinct tag IDs from user's interactions
    const distinctUserTagIds = [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...new Set(userTags.map((tag: any) => tag._id)),
    ];

    const query: FilterQuery<typeof Question> = {
      $and: [
        { tags: { $in: distinctUserTagIds } }, // Questions with user's tags
        { author: { $ne: user._id } }, // Exclude user's own questions
      ],
    };

    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const totalQuestions = await Question.countDocuments(query);

    const recommendedQuestions = await Question.find(query)
      .populate({
        path: "tags",
        model: Tag,
      })
      .populate({
        path: "author",
        model: User,
      })
      .skip(skipAmount)
      .limit(pageSize);

    const isNext = totalQuestions > skipAmount + recommendedQuestions.length;

    return { questions: recommendedQuestions, isNext };
  } catch (error) {
    console.error("Error getting recommended questions:", error);
    throw error;
  }
}

export async function getSpamQuestions(params: GetManagerQuestionsParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page = 1, pageSize = 10 } = params;

    const skipAmount = (page - 1) * pageSize;

    // Only get questions flagged as spam
    const query: FilterQuery<typeof Question> = { isSpam: true };

    let sortOptions = {};

    switch (filter) {
      case "highest_score":
        sortOptions = { spamScore: -1 };
        break;
      case "most_recent":
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { spamScore: -1 };
        break;
    }

    const questions = await Question.find(query)
      .populate({ path: 'tags', model: Tag })
      .populate({ path: 'author', model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions);

    const filteredQuestions = searchQuery
      ? questions.filter(
          (question) =>
            question.author.name.match(new RegExp(searchQuery, "i")) ||
            question.title.match(new RegExp(searchQuery, "i"))
        )
      : questions;

    const totalQuestions = await Question.countDocuments(query);

    const isNextQuestions = totalQuestions > skipAmount + questions.length;

    return { questions: filteredQuestions, isNextQuestions };
  } catch (error) {
    console.log(error);
    throw error;
  }
}