import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Award,
  User,
  Building,
  Film,
  Play,
  Star,
  CheckCircle,
  IndianRupee,
  X,
} from 'lucide-react';
import axiosInstance from '../../utils/axios';

export default function JobDescriptionPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationStatusLoading, setApplicationStatusLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applicationText, setApplicationText] = useState('');
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toastState, setToast] = useState({ message: '', type: '' });
  const [userRole, setUserRole] = useState(null);

  // Fetch job, application status, and user role
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job details
        const jobResponse = await axiosInstance.get(`/jobs/${jobId}`);
        const jobData = jobResponse.data.data;
        setJob({
          id: jobData.id,
          title: jobData.title || 'Untitled Job',
          description: jobData.description || 'No description provided.',
          category: jobData.category?.length ? jobData.category : ['Unknown'],
          budgetMin: jobData.budgetMin ?? 0,
          budgetMax: jobData.budgetMax ?? 0,
          deadline: jobData.deadline || new Date().toISOString(),
          jobDifficulty: jobData.jobDifficulty || 'Unknown',
          projectLength: jobData.projectLength || 'Unknown',
          keyResponsibilities: jobData.keyResponsibilities?.length ? jobData.keyResponsibilities : ['Not specified'],
          requiredSkills: jobData.requiredSkills?.length ? jobData.requiredSkills : [],
          tools: jobData.tools?.length ? jobData.tools : [],
          scope: jobData.scope || 'Not specified',
          name: jobData.name || 'Anonymous',
          email: jobData.email || 'N/A',
          company: jobData.company || 'Unknown',
          note: jobData.note || 'No additional notes provided.',
          sampleVideos: jobData.sampleVideos?.length ? jobData.sampleVideos : [],
          isVerified: jobData.isVerified ?? false,
        });

        // Fetch user role
        try {
          const profileResponse = await axiosInstance.get('/user/profile');
          setUserRole(profileResponse.data.data.role);
        } catch (profileError) {
          console.warn('Failed to fetch user profile:', profileError);
        }

        // Check application status (for freelancers)
        if (!userRole || userRole === 'FREELANCER') {
          try {
            const statusResponse = await axiosInstance.get(`/jobs/apply/status/${jobId}`);
            console.log('Application status:', statusResponse.data);
            setHasApplied(statusResponse.data.data.hasApplied);
            setApplicationStatus(statusResponse.data.data.status);
          } catch (statusError) {
            console.warn('Failed to fetch application status:', statusError.response?.status, statusError.message);
            setHasApplied(false);
            setApplicationStatus(null);
          } finally {
            setApplicationStatusLoading(false);
          }
        } else {
          setApplicationStatusLoading(false);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError(
          err.response?.status === 404
            ? 'Job not found.'
            : 'Failed to load job details.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, userRole]);

  // Fetch application template when modal opens (for freelancers)
  useEffect(() => {
    if (!isModalOpen || userRole !== 'FREELANCER') return;

    const fetchUserData = async () => {
      try {
        let applicationTemplate = '';
        try {
          const profileResponse = await axiosInstance.get('/user/profile');
          const profileData = profileResponse.data.data;
          applicationTemplate = profileData.applicationTemplate || '';
        } catch (profileError) {
          console.warn('Profile endpoint not available:', profileError);
        }
        setApplicationText(applicationTemplate);
        setPortfolioItems([]);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data.');
      }
    };

    fetchUserData();
  }, [isModalOpen, userRole]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setToast({ message: '', type: '' });
  };

  const togglePortfolioItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setToast({ message: '', type: '' });

    try {
      console.log('Submitting application for job:', job.id, { aboutFreelancer: applicationText });
      const response = await axiosInstance.post(`/jobs/apply/${job.id}`, {
        aboutFreelancer: applicationText,
      });

      closeModal();
      setHasApplied(true);
      toast.success(response.data.message || 'Application submitted successfully!');
    } catch (error) {
      console.error('Error submitting application:', error);
      let errorMessage = 'Failed to submit application.';
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Please log in to apply.';
            break;
          case 403:
            errorMessage = 'Only freelancers can apply for jobs.';
            break;
          case 400:
            errorMessage = error.response.data.message || 'Invalid application data.';
            break;
          case 404:
            errorMessage = 'Job not found.';
            break;
          default:
            errorMessage = 'An error occurred. Please try again.';
        }
      }
      toast.error(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Loading job details...</div>;
  }

  if (error || !job) {
    return (
      <div className="text-center py-20 text-red-600">
        {error || 'Job not found.'}
      </div>
    );
  }

  const renderApplyButton = (className) => {
    if (applicationStatusLoading) {
      return (
        <button
          className={`flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-lg transition-colors bg-gray-300 text-gray-600 cursor-wait ${className}`}
        >
          Checking status...
        </button>
      );
    }

    if (userRole === 'CLIENT') {
      return (
        <button
          onClick={() => navigate(`/jobs/${job.id}/shortlist`)}
          className={`flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 text-white ${className}`}
        >
          View Shortlist
        </button>
      );
    }

    if (applicationStatus === 'REJECTED') {
      return (
        <button
          disabled
          className={`flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-lg transition-colors border-2 border-red-500 text-red-500 bg-transparent cursor-not-allowed ${className}`}
        >
          <X className="h-4 w-4 text-red-500" />
          Rejected
        </button>
      );
    }

    return (
      <button
        onClick={openModal}
        disabled={hasApplied}
        className={`flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-lg transition-colors ${
          hasApplied
            ? 'border-2 border-green-500 text-green-500 bg-transparent cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        } ${className}`}
      >
        {hasApplied ? (
          <>
            Applied <CheckCircle className="h-4 w-4 text-green-500" />
          </>
        ) : (
          'Apply Now'
        )}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8 md:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {toastState.message && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white ${
              toastState.type === 'success'
                ? 'bg-green-600'
                : toastState.type === 'info'
                ? 'bg-blue-600'
                : 'bg-red-600'
            } z-[1000]`}
          >
            {toastState.message}
            <button
              onClick={() => setToast({ message: '', type: '' })}
              className="ml-2 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Film className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">{job.company}</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{job.title}</h1>
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < 4 ? 'fill-yellow-500' : ''}`} />
                ))}
                <span className="text-gray-600 text-sm ml-2">
                  {job.isVerified ? 'Top Rated Employer' : 'Employer'}
                </span>
              </div>
              <p className="text-gray-600 max-w-3xl">{job.description}</p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
              {renderApplyButton()}
              <button
                onClick={() => navigate(-1)}
                className="border border-purple-600 text-purple-600 hover:bg-purple-50 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Back to Jobs
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Job Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Budget Range</h3>
                    <p className="text-gray-600">
                      ₹{Number(job.budgetMin).toLocaleString('en-IN')} - ₹{Number(job.budgetMax).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Application Deadline</h3>
                    <p className="text-gray-600">
                      {new Date(job.deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Experience Level</h3>
                    <p className="text-gray-600">{job.jobDifficulty}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Project Length</h3>
                    <p className="text-gray-600">{job.projectLength}</p>
                  </div>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Project Scope</h3>
                <p className="text-gray-700">{job.scope}</p>
              </div>
            </div>
            <div className="border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Key Responsibilities</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {job.keyResponsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Required Skills & Tools</h2>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.length ? (
                    job.requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-600">No skills specified</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {job.tools.length ? (
                    job.tools.map((tool, index) => (
                      <span
                        key={index}
                        className="border border-gray-300 text-gray-800 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {tool}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-600">No tools specified</span>
                  )}
                </div>
              </div>
            </div>
            {job.sampleVideos.length > 0 && (
              <div className="border-b border-gray-200 pb-8 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Sample Videos</h2>
                <p className="text-gray-600 mb-6">
                  These videos represent the style and quality we're looking for.
                </p>
                {job.sampleVideos.map((video, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{video.title || 'Sample Video'}</h3>
                      <span className="text-gray-500 text-sm">{video.duration || 'N/A'}</span>
                    </div>
                    <p className="text-gray-600 mb-3">{video.description || 'No description'}</p>
                    <button className="flex items-center text-purple-600 hover:text-purple-800 font-medium">
                      <Play className="h-4 w-4 mr-1" /> Watch Video
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="pb-8">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Job Categories</h3>
              <div className="flex flex-wrap gap-2">
                {job.category.length ? (
                  job.category.map((category, index) => (
                    <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm">
                      {category}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-600">No categories specified</span>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="border border-gray-200 rounded-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-200 pb-4">
                Contact Information
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Contact Person</h3>
                    <p className="text-gray-600">{job.name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Email</h3>
                    <a href={`mailto:${job.email}`} className="text-purple-600 hover:underline">
                      {job.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-4 text-purple-600">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Company</h3>
                    <p className="text-gray-600">{job.company}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Additional Notes</h3>
                <p className="text-gray-600 italic mb-6">{job.note}</p>
                {renderApplyButton('w-full')}
                <div className="mt-4 text-center">
                  <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                    Share this job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-800">Apply for Position</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Job Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-700">{job.title}</h4>
                  <p className="text-gray-600 text-sm">{job.company}</p>
                </div>
                <div className="flex flex-col md:items-end">
                  <div className="flex items-center text-gray-700 mb-1">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>₹{Number(job.budgetMin).toLocaleString('en-IN')} - ₹{Number(job.budgetMax).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      {new Date(job.deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-sm">{job.description}</p>
            </div>
            <form onSubmit={handleSubmitApplication} className="p-6">
              <div className="mb-6">
                <label htmlFor="applicationText" className="block text-gray-700 font-medium mb-2">
                  Your Application
                </label>
                <textarea
                  id="applicationText"
                  value={applicationText}
                  onChange={(e) => setApplicationText(e.target.value)}
                  className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe why you're a good fit for this position..."
                  required
                ></textarea>
              </div>
              {portfolioItems.length > 0 && (
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    Attach Portfolio Items
                  </label>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {portfolioItems.map((item) => (
                      <div key={item.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          id={`portfolio-${item.id}`}
                          checked={selectedItems.includes(item.id)}
                          onChange={() => togglePortfolioItem(item.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`portfolio-${item.id}`}
                          className="ml-2 block text-gray-700"
                        >
                          {item.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-75"
                >
                  {submitLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}