"use client"

import { toast } from "@/hooks/use-toast";
import { downvoteAnswer, upvoteAnswer } from "@/lib/actions/answer.action";
import { viewQuestion } from "@/lib/actions/interaction.action";
import { downvoteQuestion, upvoteQuestion } from "@/lib/actions/question.action";
import { toggleSaveQuestion } from "@/lib/actions/user.action";
import { formatAndDivideNumber } from "@/lib/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  type: string;
  itemId: string;
  userId: string;
  upvotes: number;
  hasupVoted: boolean;
  downvotes: number;
  hasdownVoted: boolean;
  hasSaved?: boolean;
}

const Votes = ({
  type,
  itemId,
  userId,
  upvotes,
  hasupVoted,
  downvotes,
  hasdownVoted,
  hasSaved,
}: Props) => {
  const pathname = usePathname();
  const trackedQuestionRef = useRef<string | null>(null);

  const parsedItemId = useMemo(() => JSON.parse(itemId), [itemId]);
  const parsedUserId = useMemo(
    () => (userId ? JSON.parse(userId) : undefined),
    [userId]
  );

  const handleSave = async () => {
    if (!parsedUserId) {
      return toast({
        title: "Please log in",
        description: "You must be logged in to perform this action ",
      });
    }

    await toggleSaveQuestion({
      userId: parsedUserId!,
      questionId: parsedItemId,
      path: pathname,
    })

    return toast({
      title: `Question ${!hasSaved ? 'Saved in' : 'Removed from'} your collection`,
      variant: !hasSaved ? 'default' : 'destructive'
    })
  }

  const handleVote = async (action: string) => {
    if(!parsedUserId) {
      return toast({
        title: 'Please log in',
        description: 'You must be logged in to perform this action '
      })
    }

    if(action === 'upvote') {
      if(type === 'Question') {
        await upvoteQuestion({ 
          questionId: parsedItemId,
          userId: parsedUserId,
          hasupVoted,
          hasdownVoted,
          path: pathname,
        })
      } else if(type === 'Answer') {
        await upvoteAnswer({ 
          answerId: parsedItemId,
          userId: parsedUserId,
          hasupVoted,
          hasdownVoted,
          path: pathname,
        })
      }

      return toast({
        title: `Upvote ${!hasupVoted ? 'Successful' : 'Removed'}`,
        variant: !hasupVoted ? 'default' : 'destructive'
      })
    }

    if(action === 'downvote') {
      if(type === 'Question') {
        await downvoteQuestion({ 
          questionId: parsedItemId,
          userId: parsedUserId,
          hasupVoted,
          hasdownVoted,
          path: pathname,
        })
      } else if(type === 'Answer') {
        await downvoteAnswer({ 
          answerId: parsedItemId,
          userId: parsedUserId,
          hasupVoted,
          hasdownVoted,
          path: pathname,
        })
      }

      return toast({
        title: `Downvote ${!hasdownVoted ? 'Successful' : 'Removed'}`,
        variant: !hasdownVoted ? 'default' : 'destructive'
      })
    }
  }

  useEffect(() => {
    if (type !== "Question") return;

    if (trackedQuestionRef.current === parsedItemId) return;

    const trackAnonymousView = () => {
      if (typeof window === "undefined") return false;
      const storageKey = `viewed-question-${parsedItemId}`;
      if (window.localStorage.getItem(storageKey)) return false;
      window.localStorage.setItem(storageKey, "true");
      return true;
    };

    if (!parsedUserId && !trackAnonymousView()) {
      return;
    }

    trackedQuestionRef.current = parsedItemId;

    viewQuestion({
      questionId: parsedItemId,
      userId: parsedUserId,
    }).catch((error) => {
      console.error("Failed to record question view", error);
    });
  }, [parsedItemId, parsedUserId, type]);

  return (
    <div className="flex gap-5">
      <div className="flex-center gap-2.5">
        <div className="flex-center gap-1.5">
          <Image 
            src={hasupVoted
              ? '/assets/icons/upvoted.svg'
              : '/assets/icons/upvote.svg'
            }
            width={18}
            height={18}
            alt="upvote"
            className="cursor-pointer"
            onClick={() => handleVote('upvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(upvotes)}
            </p>
          </div>
        </div>

        <div className="flex-center gap-1.5">
          <Image 
            src={hasdownVoted
              ? '/assets/icons/downvoted.svg'
              : '/assets/icons/downvote.svg'
            }
            width={18}
            height={18}
            alt="downvote"
            className="cursor-pointer"
            onClick={() => handleVote('downvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(downvotes)}
            </p>
          </div>
        </div>
      </div>

      {type === 'Question' && (
        <Image 
          src={hasSaved
            ? '/assets/icons/star-filled.svg'
            : '/assets/icons/star-red.svg'
          }
          width={18}
          height={18}
          alt="star"
          className="cursor-pointer"
          onClick={handleSave}
        />
      )}
    </div>
  )
}

export default Votes