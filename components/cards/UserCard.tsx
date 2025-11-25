import { getTopInteractedTags } from '@/lib/actions/tag.actions';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'
import { Badge } from '../ui/badge';
import TagCard from './TagCard';

interface Props {
    user: {
      _id: string;
      clerkId: string;
      picture: string;
      name: string;
      username: string;
    }
  }

  const UserCard = async ({ user }: Props) => {
    const interactedTags = await getTopInteractedTags({ userId: user._id })
  
    return (
      <article className="flex w-full max-xs:min-w-full xs:w-[260px] flex-col items-center justify-center rounded-2xl p-8 border light-border background-light900_dark200 shadow-light100_darknone">
        <Link href={`/profile/${user.clerkId}`} className="flex flex-col items-center">
          <Image 
            src={user.picture}
            alt="user profile picture"
            width={100}
            height={100}
            className="rounded-full"
          />
    
          <div className="mt-4 text-center">
            <h3 className="h3-bold text-dark200_light900 line-clamp-1">
              {user.name}
            </h3>
            <p className="body-regular text-dark500_light500 mt-2">@{user.username}</p>
          </div>
        </Link>
  
        <div className="mt-5">
          {interactedTags.length > 0 ? (
            <div className="flex items-center gap-2">
                {interactedTags.map((tag) => (
                  <TagCard 
                   key={tag._id}
                   _id={tag._id}
                   name={tag.name}
                   compact
                   // Tags are now clickable and link to tag pages
                  />
                ))}
            </div>
          ) : (
            <Badge>
              No tags yet
            </Badge>
          )}
        </div>
      </article>
    )
  }

export default UserCard