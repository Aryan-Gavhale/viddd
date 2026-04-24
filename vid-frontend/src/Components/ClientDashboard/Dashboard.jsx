import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from './SideBar';
import ProjectTracker from './ProjectTracker';
import Shortlist from './ShortList';
import PaymentHistory from './PaymentHistory';
import ChatClientSection from '../ChatClientSection/page';
import axiosInstance from '../../utils/axios';

export default function Dashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split('/').pop();
    return path || 'projects';
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Update active tab when URL changes
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    setActiveTab(path || 'projects');
  }, [location]);

  // Fetch client's jobs
  useEffect(() => {
    if (activeTab === 'shortlist') {
      const fetchJobs = async () => {
        try {
          setLoading(true);
          const response = await axiosInstance.get('/jobs');
          const jobData = response.data.data || [];
          setJobs(jobData);
          toast.success('Jobs loaded successfully!');
        } catch (err) {
          console.error('Error fetching jobs:', err);
          toast.error('Failed to load jobs. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectTracker />;
      case 'shortlist':
        return <Shortlist />;
      case 'payments':
        return <PaymentHistory />;
      case 'settings':
        return <div>Settings Content</div>;
      default:
        return <ProjectTracker />;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-auto mt-16">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900 capitalize">
              {activeTab}
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}