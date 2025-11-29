"use server"

import User from "@/database/user.model";
import { connectToDatabase } from "../mongoose"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GetAllTagsParams, GetQuestionsByTagIdParams, GetTopInteractedTagsParams } from "./shared.types";
import { FilterQuery, Types } from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Tag, {ITag} from "@/database/tag.model";
import Question from "@/database/question.model";
type TagCountEntry = {
  count: number;
  tag: ITag | null;
};

export async function getTopInteractedTags(params: GetTopInteractedTagsParams) {
    try {
      await connectToDatabase();
  
      const { userId, limit = 2 } = params;
  
      const user = await User.findById(userId);
  
      if(!user) throw new Error("User not found");

      // Find all questions the user has asked (where user is the author)
      const userQuestions = await Question.find({ 
        author: userId 
      }).populate('tags', '_id name');

      // Collect all tag IDs from questions the user has asked
      const tagCounts = new Map<string, TagCountEntry>();
      
      userQuestions.forEach((question) => {
        if (question.tags && Array.isArray(question.tags)) {
          question.tags.forEach((tag: ITag | Types.ObjectId) => {
            const tagId =
              tag instanceof Types.ObjectId ? tag.toString() : tag._id?.toString();

            if (!tagId) return;

            if (tagCounts.has(tagId)) {
              tagCounts.get(tagId)!.count += 1;
            } else {
              tagCounts.set(tagId, {
                count: 1,
                tag: typeof tag === 'object' ? (tag as ITag) : null
              });
            }
          });
        }
      });

      // Get tag details for the most frequently used tags
      const sortedTagIds = Array.from(tagCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([tagId]) => tagId);

      if (sortedTagIds.length === 0) {
        return [];
      }

      // Fetch full tag details
      const tags = await Tag.find({
        _id: { $in: sortedTagIds.map(id => new Types.ObjectId(id)) }
      }).select('_id name').limit(limit);

      // Return in the same order as sorted by frequency
      const tagMap = new Map(tags.map(tag => [tag._id.toString(), tag]));
      return sortedTagIds
        .map(tagId => tagMap.get(tagId))
        .filter(Boolean)
        .map(tag => ({
          _id: tag!._id.toString(),
          name: tag!.name
        }));
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  export async function getAllTags(params: GetAllTagsParams) {
    try {
      await connectToDatabase();
  
      const { searchQuery, filter, page = 1, pageSize = 10 } = params;
      
      const skipAmount = (page - 1) * pageSize;
  
      const query: FilterQuery<typeof Tag> = {};
  
      if(searchQuery) {
        const escapedSearchQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        query.$or = [{name: { $regex: new RegExp(escapedSearchQuery, 'i')}}]
      }
  
      let sortOptions = {};
  
      switch (filter) {
        case "popular":
          sortOptions = { questions: -1 }
          break;
        case "recent":
          sortOptions = { createdAt: -1 }
          break;
        case "name":
          sortOptions = { name: 1 }
          break;
        case "old":
          sortOptions = { createdAt: 1 }
          break;
      
        default:
          break;
      }
  
      const totalTags = await Tag.countDocuments(query);
  
      const tags = await Tag.find(query)
        .sort(sortOptions)
        .skip(skipAmount)
        .limit(pageSize);
  
        const isNext = totalTags > skipAmount + tags.length;
  
      return { tags, isNext }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  export async function getQuestionsByTagId(params: GetQuestionsByTagIdParams) {
    try {
      await connectToDatabase();
  
      const { tagId, page = 1, pageSize = 10, searchQuery } = params;
      const skipAmount = (page - 1) * pageSize;
  
      // Validate that tagId is a valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(tagId)) {
        throw new Error(`Invalid tag ID format: "${tagId}". Tag ID must be a valid MongoDB ObjectId.`);
      }
  
      const tagFilter: FilterQuery<ITag> = { _id: new Types.ObjectId(tagId) };
  
      const tag = await Tag.findOne(tagFilter).populate({
        path: 'questions',
        model: Question,
        match: searchQuery
          ? { title: { $regex: searchQuery, $options: 'i' }}
          : {},
        options: {
          sort: { createdAt: -1 },
          skip: skipAmount,
          limit: pageSize + 1 // +1 to check if there is next page
        },
        populate: [
          { path: 'tags', model: Tag, select: "_id name" },
          { path: 'author', model: User, select: '_id clerkId name picture'}
        ]
      })
  
      if(!tag) {
        throw new Error('Tag not found');
      }
  
      const isNext = tag.questions.length > pageSize;

      // Only return the first `pageSize` questions; the extra one is used
      // solely to detect if a next page exists.
      const questions = tag.questions.slice(0, pageSize);

      return { tagTitle: tag.name, questions, isNext };
  
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  export async function getTopPopularTags() {
    try {
      await connectToDatabase();
  
      const popularTags = await Tag.aggregate([
        { $project: { name: 1, numberOfQuestions: { $size: "$questions" }}},
        { $sort: { numberOfQuestions: -1 }}, 
        { $limit: 6 }
      ])
  
      return popularTags;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }