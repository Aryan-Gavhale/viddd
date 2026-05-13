// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../utils/axios";
//import PortfolioUpload from "./PortfolioUpload.jsx";

function Dashboard() {
  const { id, firstname, role } = useSelector((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const endpoint = role === "FREELANCER" ? "/profiles/freelancer" : "/jobs";
        const response = await axiosInstance.get(endpoint);
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDashboardData();
  }, [id, role]);

  if (!id) {
    return <div className="text-center p-4">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {firstname}!</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <div className="space-y-6">
          {role === "FREELANCER" ? (
            <>
              <h2 className="text-xl font-semibold">Your Freelancer Profile</h2>
              <p>Job Title: {data.jobTitle}</p>
              <p>Total Earnings: ${data.totalEarnings}</p>
              <p>Rating: {data.rating || "N/A"}</p>
              <h3 className="text-lg font-medium">Portfolio Videos</h3>
              <ul>
                {data.portfolioVideos.map((video) => (
                  <li key={video.id}>
                    {video.title} - <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">View</a>
                  </li>
                ))}
              </ul>
              
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Your Posted Jobs</h2>
              <ul>
                {data.jobs.map((job) => (
                  <li key={job.id}>{job.title} - Budget: ${job.budgetMin}-${job.budgetMax}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;