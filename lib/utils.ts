/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import qs from "query-string"
import { BADGE_CRITERIA } from "@/constants";
import { BadgeCounts } from "@/types";
import { techMap } from "@/constants/techMap";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getDeviconClassName = (techName: string) => {
  const normalizedTechName = techName.replace(/[ .]/g, "").toLowerCase();

  return techMap[normalizedTechName]
    ? `${techMap[normalizedTechName]} colored`
    : "devicon-devicon-plain";
};

export const getTimestamp = (createdAt: Date, now?: Date): string => {
  // Use provided now time or current time
  const currentTime = now || new Date();
  
  const minute = 60 * 1000;
  const nowRounded = new Date(Math.floor(currentTime.getTime() / minute) * minute);
  const createdAtRounded = new Date(Math.floor(createdAt.getTime() / minute) * minute);
  
  const timeDifference = nowRounded.getTime() - createdAtRounded.getTime();

  // Define time intervals in milliseconds
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  // Use a slightly wider \"just now\" window (< 2 minutes) so that small
  // server/client timing differences around hydration don't flip between
  // \"just now\" and \"1 minute ago\".
  if (timeDifference < 2 * minute) {
    return "just now";
  } else if (timeDifference < hour) {
    const minutes = Math.floor(timeDifference / minute);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (timeDifference < day) {
    const hours = Math.floor(timeDifference / hour);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (timeDifference < week) {
    const days = Math.floor(timeDifference / day);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (timeDifference < month) {
    const weeks = Math.floor(timeDifference / week);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (timeDifference < year) {
    const months = Math.floor(timeDifference / month);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(timeDifference / year);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

export const formatAndDivideNumber = (num: number): string => {
  if (num >= 1000000) {
    const formattedNum = (num / 1000000).toFixed(1);
    return `${formattedNum}M`;
  } else if (num >= 1000) {
    const formattedNum = (num / 1000).toFixed(1);
    return `${formattedNum}K`;
  } else {
    return num.toString();
  }
};

export const getJoinedDate = (date: Date): string => {
  // Extract the day, month, and year from the Date object
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  const joinedDate = `${month} ${day}, ${year}`;

  return joinedDate;
}

interface UrlQueryParams {
  params: string;
  key: string;
  value: string | null;
}

export const formUrlQuery = ({ params, key, value}: UrlQueryParams) => {
  const currentUrl = qs.parse(params);

  currentUrl[key] = value;

  return qs.stringifyUrl({
    url: window.location.pathname,
    query: currentUrl,
  },
  { skipNull: true})
}

interface RemoveUrlQueryParams {
  params: string;
  keysToRemove: string[];
}

export const removeKeysFromQuery = ({ params, keysToRemove}: RemoveUrlQueryParams) => {
  const currentUrl = qs.parse(params);

  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  })

  return qs.stringifyUrl({
    url: window.location.pathname,
    query: currentUrl,
  },
  { skipNull: true})
}

interface BadgeParam {
  criteria: {
    type: keyof typeof BADGE_CRITERIA;
    count: number;
  }[]
}

export const assignBadges = (params: BadgeParam) => {
  const badgeCounts: BadgeCounts = {
    GOLD: 0,
    SILVER: 0,
    BRONZE: 0,
  }

  const { criteria } = params;

  criteria.forEach((item) => {
    const { type, count } = item;
    
    const badgeLevels: any = BADGE_CRITERIA[type];

    
    Object.keys(badgeLevels).forEach((level: any) => {
      if(count >= badgeLevels[level]) {
        badgeCounts[level as keyof BadgeCounts] +=1 ;
      }
    })
  })

  return badgeCounts;
}

// SWR Fetcher function
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
}