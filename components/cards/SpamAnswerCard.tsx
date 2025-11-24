import Link from "next/link";
import Metric from "../shared/Metric";
import { getTimestamp } from "@/lib/utils";
import { SignedIn } from "@clerk/nextjs";
import ManagerDeleteAction from "../shared/ManagerDeleteAction";

interface SpamAnswerProps {
  _id: string;
  content: string;
  question: {
    _id: string;
    title: string;
  };
  author: {
    _id: string;
    clerkId: string;
    name: string;
    picture: string;
  };
  createdAt: Date;
  spamScore: number;
  spamReason?: string;
}

const SpamAnswerCard = ({
  _id,
  content,
  question,
  author,
  createdAt,
  spamScore,
  spamReason,
}: SpamAnswerProps) => {
  return (
    <div className="card-wrapper rounded-[10px] border-2 border-red-500 px-11 py-9">
      <div className="flex flex-col-reverse items-start justify-between gap-5 sm:flex-row">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
              SPAM DETECTED
            </span>
            <span className="text-sm font-medium text-red-600">
              Score: {spamScore}
            </span>
          </div>
          <span className="subtle-regular text-dark400_light700 line-clamp-1 flex sm:hidden">
            {getTimestamp(createdAt)}
          </span>
          <Link href={`/question/${question._id}/#${_id}`}>
            <h3 className="sm:h3-semibold base-semibold text-dark200_light900 line-clamp-1 flex-1">
              Answer to: {question.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-3 text-sm text-dark400_light700">
            {content}
          </p>
          {spamReason && (
            <p className="mt-2 text-sm text-red-600">
              <strong>Reason:</strong> {spamReason}
            </p>
          )}
        </div>
        <SignedIn>
          <ManagerDeleteAction type="Answer" itemId={JSON.stringify(_id)} />
        </SignedIn>
      </div>

      <div className="flex-between mt-6 w-full flex-wrap gap-3">
        <Metric
          imgUrl={author.picture}
          alt="user avatar"
          value={author.name}
          title={` • answered ${getTimestamp(createdAt)}`}
          href={`/profile/${author.clerkId}`}
          textStyles="body-medium text-dark400_light700"
          isAuthor
        />
      </div>
    </div>
  );
};

export default SpamAnswerCard;
