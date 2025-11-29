"use client"

import { toast } from "@/hooks/use-toast";
import { downvoteAnswer, upvoteAnswer } from "@/lib/actions/answer.action";
import { viewQuestion } from "@/lib/actions/interaction.action";
import { downvoteQuestion, upvoteQuestion } from "@/lib/actions/question.action";
import { toggleSaveQuestion } from "@/lib/actions/user.action";
import { formatAndDivideNumber } from "@/lib/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  // Store the string representation for comparison (parsedItemId could be an object)
  const trackedQuestionRef = useRef<string | null>(null);
  
  // Loading states for optimistic UI
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(downvotes);
  const [localHasUpvoted, setLocalHasUpvoted] = useState(hasupVoted);
  const [localHasDownvoted, setLocalHasDownvoted] = useState(hasdownVoted);
  const [localHasSaved, setLocalHasSaved] = useState(hasSaved);

  const parsedItemId = useMemo(() => {
    try {
      return JSON.parse(itemId)
    } catch (error) {
      console.error("[Votes] Failed to parse itemId JSON:", { itemId, error })
      // Fallback: use the raw string so voting/saving can still work
      return itemId
    }
  }, [itemId]);
  const parsedUserId = useMemo(() => {
    if (!userId) {
      return undefined
    }
    try {
      return JSON.parse(userId)
    } catch (error) {
      console.error("[Votes] Failed to parse userId JSON:", { userId, error })
      // Fallback: return undefined if parsing fails (user not authenticated or invalid format)
      return undefined
    }
  }, [userId]);
  
  // Get string version of itemId for comparison and storage
  const itemIdString = useMemo(() => {
    if (typeof parsedItemId === "string") {
      return parsedItemId
    }
    if (parsedItemId == null) {
      return itemId
    }
    // If it's an object, convert to string for comparison
    return String(parsedItemId)
  }, [parsedItemId, itemId]);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalUpvotes(upvotes);
    setLocalDownvotes(downvotes);
    setLocalHasUpvoted(hasupVoted);
    setLocalHasDownvoted(hasdownVoted);
    setLocalHasSaved(hasSaved);
  }, [upvotes, downvotes, hasupVoted, hasdownVoted, hasSaved]);

  const handleSave = async () => {
    if (!parsedUserId) {
      return toast({
        title: "Please log in",
        description: "You must be logged in to perform this action",
      });
    }

    if (isSaving) return; // Prevent double-clicking

    const previousSaved = localHasSaved;
    setIsSaving(true);
    setLocalHasSaved(!previousSaved); // Optimistic update

    try {
      await toggleSaveQuestion({
        userId: parsedUserId!,
        questionId: parsedItemId,
        path: pathname,
      });

      toast({
        title: `Question ${!previousSaved ? 'Saved in' : 'Removed from'} your collection`,
        variant: !previousSaved ? 'default' : 'destructive'
      });
    } catch (error) {
      // Revert optimistic update on error
      setLocalHasSaved(previousSaved);
      toast({
        title: "Failed to update collection",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleVote = async (action: 'upvote' | 'downvote') => {
    if (!parsedUserId) {
      return toast({
        title: 'Please log in',
        description: 'You must be logged in to perform this action'
      });
    }

    if (isVoting) return; // Prevent double-clicking

    // Store previous state for rollback
    const prevUpvotes = localUpvotes;
    const prevDownvotes = localDownvotes;
    const prevHasUpvoted = localHasUpvoted;
    const prevHasDownvoted = localHasDownvoted;

    setIsVoting(true);

    // Optimistic updates
    if (action === 'upvote') {
      if (prevHasUpvoted) {
        // Removing upvote
        setLocalUpvotes(prev => prev - 1);
        setLocalHasUpvoted(false);
      } else {
        // Adding upvote
        setLocalUpvotes(prev => prev + 1);
        setLocalHasUpvoted(true);
        // If previously downvoted, remove downvote
        if (prevHasDownvoted) {
          setLocalDownvotes(prev => prev - 1);
          setLocalHasDownvoted(false);
        }
      }
    } else {
      // downvote
      if (prevHasDownvoted) {
        // Removing downvote
        setLocalDownvotes(prev => prev - 1);
        setLocalHasDownvoted(false);
      } else {
        // Adding downvote
        setLocalDownvotes(prev => prev + 1);
        setLocalHasDownvoted(true);
        // If previously upvoted, remove upvote
        if (prevHasUpvoted) {
          setLocalUpvotes(prev => prev - 1);
          setLocalHasUpvoted(false);
        }
      }
    }

    try {
      if (action === 'upvote') {
        if (type === 'Question') {
          await upvoteQuestion({ 
            questionId: parsedItemId,
            userId: parsedUserId,
            hasupVoted: prevHasUpvoted,
            hasdownVoted: prevHasDownvoted,
            path: pathname,
          });
        } else if (type === 'Answer') {
          await upvoteAnswer({ 
            answerId: parsedItemId,
            userId: parsedUserId,
            hasupVoted: prevHasUpvoted,
            hasdownVoted: prevHasDownvoted,
            path: pathname,
          });
        }
      } else {
        // downvote
        if (type === 'Question') {
          await downvoteQuestion({ 
            questionId: parsedItemId,
            userId: parsedUserId,
            hasupVoted: prevHasUpvoted,
            hasdownVoted: prevHasDownvoted,
            path: pathname,
          });
        } else if (type === 'Answer') {
          await downvoteAnswer({ 
            answerId: parsedItemId,
            userId: parsedUserId,
            hasupVoted: prevHasUpvoted,
            hasdownVoted: prevHasDownvoted,
            path: pathname,
          });
        }
      }

      // Success toast (only show for adding votes, not removing)
      if ((action === 'upvote' && !prevHasUpvoted) || (action === 'downvote' && !prevHasDownvoted)) {
        toast({
          title: `${action === 'upvote' ? 'Upvote' : 'Downvote'} successful`,
          variant: 'default'
        });
      }
    } catch (error) {
      // Revert optimistic updates on error
      setLocalUpvotes(prevUpvotes);
      setLocalDownvotes(prevDownvotes);
      setLocalHasUpvoted(prevHasUpvoted);
      setLocalHasDownvoted(prevHasDownvoted);

      toast({
        title: `Failed to ${action}`,
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  }

  useEffect(() => {
    if (type !== "Question") return;

    if (trackedQuestionRef.current === itemIdString) return;

    const trackAnonymousView = () => {
      if (typeof window === "undefined") return false;
      const storageKey = `viewed-question-${itemIdString}`;
      if (window.localStorage.getItem(storageKey)) return false;
      window.localStorage.setItem(storageKey, "true");
      return true;
    };

    if (!parsedUserId && !trackAnonymousView()) {
      return;
    }

    trackedQuestionRef.current = itemIdString;

    // Debounce view tracking to prevent excessive API calls
    // Track view after a short delay to ensure user actually viewed the question
    const viewTrackingTimeout = setTimeout(() => {
      viewQuestion({
        questionId: parsedItemId,
        userId: parsedUserId,
      }).catch((error) => {
        console.error("Failed to record question view", error);
        // Don't show error toast for view tracking failures - it's non-critical
      });
    }, 1000); // Wait 1 second before tracking view

    // Cleanup timeout if component unmounts or question changes
    return () => {
      clearTimeout(viewTrackingTimeout);
    };
  }, [parsedItemId, parsedUserId, type, itemIdString]);

  return (
    <div className="flex gap-5">
      <div className="flex-center gap-2.5">
        <div className="flex-center gap-1.5">
          <Image 
            src={localHasUpvoted
              ? '/assets/icons/upvoted.svg'
              : '/assets/icons/upvote.svg'
            }
            width={18}
            height={18}
            alt="upvote"
            className={`cursor-pointer transition-opacity ${
              isVoting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
            }`}
            onClick={() => !isVoting && handleVote('upvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(localUpvotes)}
            </p>
          </div>
        </div>

        <div className="flex-center gap-1.5">
          <Image 
            src={localHasDownvoted
              ? '/assets/icons/downvoted.svg'
              : '/assets/icons/downvote.svg'
            }
            width={18}
            height={18}
            alt="downvote"
            className={`cursor-pointer transition-opacity ${
              isVoting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
            }`}
            onClick={() => !isVoting && handleVote('downvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(localDownvotes)}
            </p>
          </div>
        </div>
      </div>

      {type === 'Question' && (
        <Image 
          src={localHasSaved
            ? '/assets/icons/star-filled.svg'
            : '/assets/icons/star-red.svg'
          }
          width={18}
          height={18}
          alt="star"
          className={`cursor-pointer transition-opacity ${
            isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
          }`}
          onClick={() => !isSaving && handleSave()}
        />
      )}
    </div>
  )
}

export default Votes