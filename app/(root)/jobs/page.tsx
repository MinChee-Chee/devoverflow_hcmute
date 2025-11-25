/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import NoResult from "@/components/shared/NoResult";
import { Job } from "@/types";
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

export default function Jobs() {
  // Use SWR to fetch jobs - shows cached data immediately while fetching updates
  const { data, error, isLoading } = useSWR('/api/jobs', fetcher, {
    refreshInterval: 60000, // Refresh every 60 seconds
    revalidateOnFocus: true,
  });

  const jobs: Job[] = data?.jobs || [];

  // Show initial loading only once
  if (isLoading && !data) {
    return (
      <>
        <h1 className="h1-bold text-dark100_light900">IT Jobs for UTE Future Devs</h1>
        <div className="mt-10 flex w-full flex-col gap-6">
          <div className="py-8 text-center">
            <p className="text-dark400_light700">Loading jobs...</p>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <h1 className="h1-bold text-dark100_light900">IT Jobs for UTE Future Devs</h1>
        <div className="mt-10 flex w-full flex-col gap-6">
          <NoResult
            title="Error loading jobs"
            description="Failed to fetch jobs. Please try refreshing the page."
            link="/"
            linkTitle="Back to DevOverflow"
          />
        </div>
      </>
    );
  }

  return (
    <>
        <h1 className="h1-bold text-dark100_light900">IT Jobs for UTE Future Devs</h1> 

        <div className="mt-10 flex w-full flex-col gap-6">
        {jobs.length > 0 ? (
          jobs.map((job: any, index: number) => (
            <div
              key={index}
              className="rounded-lg border p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="text-lg font-semibold dark:text-white">{job.job_title}</h2>
              <p className="dark:text-gray-300">
                <strong>Company:</strong> {job.employer_name}
              </p>
              {job.employer_logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.employer_logo} alt="Company Logo" className="size-20" />
              )}
              <p className="dark:text-gray-300">
                <strong>Location:</strong> {job.job_city}, {job.job_state}, {job.job_country}
              </p>
              <p className="dark:text-gray-300">
                <strong>Publisher:</strong> {job.job_publisher}
              </p>
              <p className="dark:text-gray-300">
                <strong>Employment Type:</strong> {job.job_employment_type}
              </p>
              <p className="dark:text-gray-300">
                <strong>Remote:</strong> {job.job_is_remote ? 'Yes' : 'No'}
              </p>
              <p className="dark:text-gray-300">
                <strong>Posted At:</strong> {new Date(job.job_posted_at_timestamp * 1000).toLocaleDateString()}
              </p>
              <p className="dark:text-gray-300">
                <strong>Expiration Date:</strong> {new Date(job.job_offer_expiration_timestamp * 1000).toLocaleDateString()}
              </p>
              <p className="dark:text-gray-300">
                <strong>Experience Required:</strong> {job.job_required_experience?.required_experience_in_months || 'N/A'} months
              </p>
              <p className="dark:text-gray-300">
                <strong>Job Description:</strong> {job.job_description}
              </p>
              {job.job_benefits && (
                <p className="dark:text-gray-300">
                  <strong>Benefits:</strong> {job.job_benefits.join(', ')}
                </p>
              )}
              <p className="text-primary-500 dark:text-blue-400">
                <strong>Apply Here:</strong>{' '}
                <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer">
                  Apply Now
                </a>
              </p>
            </div>
          ))
        ) : (
          <NoResult
            title="There's no jobs to show"
            description="No jobs found right now, but don't worry! New opportunities are posted regularly. Please check back soon."
            link="/"
            linkTitle="Back to DevOverflow"
          />
        )}
      </div>
    </>
  );
}

// Can't make the search bar and filter available to use at the moment.
// This is the beta test for Find Jobs, the page is still under development. The page will be updated with more features and improvements in the future. Stay tuned!
// It will be developed in the future to imporve the user experience and add more features. Stay tuned!