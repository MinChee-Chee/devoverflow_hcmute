import Filter from '@/components/shared/Filter';
import NoResult from '@/components/shared/NoResult';
import Pagination from '@/components/shared/Pagination';
import LocalSearchbar from '@/components/shared/search/LocalSearchbar';
import { getSpamQuestions } from '@/lib/actions/question.action';
import { getSpamAnswers } from '@/lib/actions/answer.action';
import { SearchParamsProps } from '@/types';
import React from 'react';
import SpamQuestionCard from '@/components/cards/SpamQuestionCard';
import SpamAnswerCard from '@/components/cards/SpamAnswerCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SpamFilters = [
  { name: "Highest Spam Score", value: "highest_score" },
  { name: "Most Recent", value: "most_recent" },
];

const page = async ({ searchParams }: SearchParamsProps) => {
  const questionsResult = await getSpamQuestions({
    searchQuery: searchParams.q,
    filter: searchParams.filter,
    page: searchParams.page ? +searchParams.page : 1,
  });

  const answersResult = await getSpamAnswers({
    searchQuery: searchParams.q,
    filter: searchParams.filter,
    page: searchParams.page ? +searchParams.page : 1,
  });

  return (
    <>
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">Spam Detection</h1>
      </div>

      <div className="mt-4 text-dark500_light700">
        <p>Content flagged as spam or prohibited by the automated detection system.</p>
      </div>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearchbar
          route="/dashboard/moderator/spam"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search flagged content"
          otherClasses="flex-1"
        />
        <Filter filters={SpamFilters} otherClasses="min-h-[56px] sm:min-w-[170px]" />
      </div>

      <Tabs defaultValue="questions" className="mt-10">
        <TabsList className="background-light800_dark400 min-h-[42px] p-1">
          <TabsTrigger value="questions" className="tab">
            Flagged Questions ({questionsResult.questions.length})
          </TabsTrigger>
          <TabsTrigger value="answers" className="tab">
            Flagged Answers ({answersResult.answers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-8 flex w-full flex-col gap-6">
          {questionsResult.questions.length > 0 ? (
            questionsResult.questions.map((question) => (
              <SpamQuestionCard
                key={question._id}
                _id={question._id}
                title={question.title}
                tags={question.tags}
                author={question.author}
                views={question.views}
                answers={question.answers}
                createdAt={question.createdAt}
                spamScore={question.spamScore}
                spamReason={question.spamReason}
              />
            ))
          ) : (
            <NoResult
              title="No spam questions detected"
              description="Great news! No questions have been flagged as spam."
              link="/dashboard/moderator"
              linkTitle="Back to dashboard"
            />
          )}
          <div className="mt-9">
            <Pagination
              pageNumber={searchParams?.page ? +searchParams.page : 1}
              isNext={questionsResult.isNextQuestions}
            />
          </div>
        </TabsContent>

        <TabsContent value="answers" className="mt-8 flex w-full flex-col gap-6">
          {answersResult.answers.length > 0 ? (
            answersResult.answers.map((answer) => (
              <SpamAnswerCard
                key={answer._id}
                _id={answer._id}
                content={answer.content}
                author={answer.author}
                question={answer.question}
                createdAt={answer.createdAt}
                spamScore={answer.spamScore}
                spamReason={answer.spamReason}
              />
            ))
          ) : (
            <NoResult
              title="No spam answers detected"
              description="Great news! No answers have been flagged as spam."
              link="/dashboard/moderator"
              linkTitle="Back to dashboard"
            />
          )}
          <div className="mt-9">
            <Pagination
              pageNumber={searchParams?.page ? +searchParams.page : 1}
              isNext={answersResult.isNextAnswer}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default page;
