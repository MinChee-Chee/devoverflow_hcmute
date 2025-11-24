/* eslint-disable @typescript-eslint/no-explicit-any */
import Answer from "@/components/forms/Answer";
import AllAnswers from "@/components/shared/AllAnswers";
import Metric from "@/components/shared/Metric";
import ParseHTML from "@/components/shared/ParseHTML";
import TagCard from "@/components/cards/TagCard";
import Votes from "@/components/shared/Votes";
import { getQuestionById } from "@/lib/actions/question.action";
import { getUserById } from "@/lib/actions/user.action";
import { formatAndDivideNumber, getTimestamp } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Question = async ({params, searchParams}: any) => {

  const result = await getQuestionById({questionId: params.id});
  const {userId: clerkId} = auth();

  let mongoUser;
  if (clerkId) {
    mongoUser = await getUserById({userId: clerkId})
  }
  return (
  <>
    <div className="flex-start w-full flex-col">
    <div className="flex w-full flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
      <Link href={`/profile/${result.author.clerkId}`}  className="flex items-center justify-start gap-1" >
        <Image
          src={result.author.picture}
          className="rounded-full"
          width={25}
          height={25}
          alt="profile"
        />
        <p className="paragraph-semibold text-dark300_light700">
          {result.author.name}
        </p>
      </Link> 
        <div className="flex justify-end">
            <Votes
              type="Question"
              itemId={JSON.stringify(result._id)}
              userId={mongoUser ? JSON.stringify(mongoUser._id) : ""}
              upvotes={result.upvotes.length}
              hasupVoted={mongoUser ? result.upvotes.includes(mongoUser._id) : false}
              downvotes={result.downvotes.length}
              hasdownVoted={mongoUser ? result.downvotes.includes(mongoUser._id) : false}
              hasSaved={mongoUser?.saved.includes(result._id)}
            />
        </div>
    </div>
    <h2 className="h2-semibold text-dark200_light900 mt-3.5 w-full text-left">{result.title}</h2>
    </div>
    <div className="mb-8 mt-5 flex flex-wrap gap-4">
        <Metric
          imgUrl="/assets/icons/clock.svg"
          alt="clock icon"
          value={` asked ${getTimestamp(result.createdAt)}`}
          title=""
          textStyles="small-medium text-dark400_light800"
        />
        <Metric
          imgUrl="/assets/icons/message.svg"
          alt="message"
          value={formatAndDivideNumber(result.answers.length)}
          title=" Answers"
          textStyles="small-medium text-dark400_light800"
        />
        <Metric
          imgUrl="/assets/icons/eye.svg"
          alt="eye"
          value={formatAndDivideNumber(result.views)}
          title=" Views"
          textStyles="small-medium text-dark400_light800"
        />
    </div>
    <ParseHTML
    data={result.content}
    />

    <div className="mt-8 flex flex-wrap gap-2">
      {result.tags.map((tag: any) => (
        <TagCard
        key={tag._id}
        _id={tag._id}
        name={tag.name}
        compact
        />
      ))}
    </div>

    <AllAnswers
    questionId={result._id}
    userId={mongoUser? mongoUser._id: ""}
    totalAnswers={result.answers.length}
    page={searchParams?.page}
    filter={searchParams?.filter}
    />

    <Answer
    question={result.content}
    questionTitle={result.title}
    questionId={JSON.stringify(result._id)}
    authorId={mongoUser ? JSON.stringify(mongoUser._id) : ""}/>
  </>
  )
};

export default Question;