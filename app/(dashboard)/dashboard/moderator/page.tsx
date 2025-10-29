import { Button } from '@/components/ui/button';
import { Protect } from '@clerk/nextjs';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

import React from 'react'

const Moderator = () => {
  return (
    <>
    <Protect
      condition={(has) => has({ role: 'org:moderator' }) || has({ role: 'org:admin' })}
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-lg font-medium">You do not have access to this page.</p>
            <Link href="/" passHref>
              <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Go Back to Home
              </button>
            </Link>
          </div>
        </div>
      }
    >
        <div className="mt-4">
        <Card>
          <CardHeader>
            <CardDescription>
              Home of the moderators!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Welcome to the moderator dashboard. Here you can manage content, review reports, and perform other moderation tasks.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Alert>
          <Terminal className="size-4" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            Keep up the great work, moderators! Your efforts make our community a better place every day!
          </AlertDescription>
        </Alert>
      </div>
        <div className="mt-8 flex justify-center space-x-10 max-sm:w-full">
          <Link href="/dashboard/moderator/questions" className="flex max-sm:w-full">
            <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900">
              Manage Questions
            </Button>
          </Link>
          <Link href="/dashboard/moderator/answers" className="flex max-sm:w-full">
            <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900">
              Manage Answers
            </Button>
          </Link>
          <Link href="/dashboard/moderator/replies" className="flex max-sm:w-full">
            <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900">
              Manage Replies
            </Button>
          </Link>
        </div>
        <div className="mt-4 flex justify-center">
          <Link href="/dashboard/moderator/spam" className="flex max-sm:w-full">
            <Button className="min-h-[46px] border-2 border-red-500 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900">
              🛡️ Review Spam Detection
            </Button>
          </Link>
        </div>
    </Protect>
    </>
  )
}

export default Moderator