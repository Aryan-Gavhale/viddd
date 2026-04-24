import { useState, useEffect } from 'react';
import { JobCard } from "./job-card";
import { JobFilters } from "./job-filters";
import { JobModal } from "./job-modal";
import { EmptySavedJobs } from "./empty-saved-jobs";
import axiosInstance from "../../utils/axios";

export default function SearchAndBrowsePage() {
  const [jobs, setJobs] = useState([]); // All jobs fetched from backend
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('best-matches');
  const [savedJobs, setSavedJobs] = useState(new Set()); // Saved job IDs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jobs from backend on component mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/job');
        const fetchedJobs = response.data.data.map(job => ({
          id: job._id || job.id, // Assuming your backend returns an ID
          title: job.title,
          description: job.description,
          budget: {
            type: job.budgetMin && job.budgetMax ? 'fixed' : 'hourly', // Adjust logic based on your backend
            amount: job.budgetMin && job.budgetMax ? `$${job.budgetMin}-${job.budgetMax}` : '$0', // Placeholder
            duration: job.projectLength || 'Unknown',
          },
          postedTime: calculatePostedTime(job.createdAt), // Assuming createdAt timestamp from backend
          skills: job.requiredSkills.concat(job.tools || []),
          clientInfo: {
            verified: true, // Adjust based on backend data
            spent: '10', // Placeholder, update with real data if available
            rating: 4.8, // Placeholder
          },
          location: job.location || 'Remote', // Add location field to backend if needed
          proposals: job.proposals || 0, // Add proposals count to backend if needed
          thumbnail: job.videoFile ? `/uploads/${job.videoFile}` : '/placeholder.svg?height=150&width=250', // Adjust based on file storage
          experienceLevel: job.jobDifficulty || 'Intermediate',
        }));
        setJobs(fetchedJobs);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Calculate time since posting
  const calculatePostedTime = (createdAt) => {
    const now = new Date();
    const posted = new Date(createdAt);
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Handle saving/unsaving a job
  const handleSaveToggle = (jobId) => {
    setSavedJobs((prev) => {
      const newSaved = new Set(prev);
      if (newSaved.has(jobId)) {
        newSaved.delete(jobId);
      } else {
        newSaved.add(jobId);
      }
      // Optionally persist to localStorage or backend here
      sessionStorage.setItem('savedJobs', JSON.stringify([...newSaved]));
      return newSaved;
    });
  };

  // Load saved jobs from localStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('savedJobs');
    if (saved) {
      setSavedJobs(new Set(JSON.parse(saved)));
    }
  }, []);

  // Sort and filter jobs based on active tab
  const getJobsByTab = () => {
    let filteredJobs = [...jobs];

    switch (activeTab) {
      case 'best-matches':
        // Simple sorting by skills length (more skills = better match, as a placeholder)
        return filteredJobs.sort((a, b) => b.skills.length - a.skills.length);
      case 'most-recent':
        // Sort by posted time (assuming createdAt is available)
        return filteredJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'saved-jobs':
        return filteredJobs.filter((job) => savedJobs.has(job.id));
      default:
        return filteredJobs;
    }
  };

  const displayJobs = getJobsByTab();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Video Editing Jobs</h1>
          <p className="mt-2 text-gray-600">
            Browse jobs that match your experience to a client's hiring preferences
          </p>
        </div>

        <div className="mb-6 flex gap-4 border-b border-gray-200">
          {[
            { id: 'best-matches', label: 'Best Matches' },
            { id: 'most-recent', label: 'Most Recent' },
            { id: 'saved-jobs', label: 'Saved Jobs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <JobFilters />
          <div className="flex-1 space-y-6">
            {loading ? (
              <p className="text-center text-gray-600">Loading jobs...</p>
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : activeTab === 'saved-jobs' && displayJobs.length === 0 ? (
              <EmptySavedJobs />
            ) : (
              displayJobs.map((job) => (
                <JobCard
                  key={job.id}
                  {...job}
                  isSaved={savedJobs.has(job.id)}
                  onSaveToggle={handleSaveToggle}
                  onClick={() => setSelectedJob(job)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedJob && <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}