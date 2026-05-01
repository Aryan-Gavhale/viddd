import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import chatStore from "../../state/chatStore.js";
import axiosInstance from "../../utils/axios.js";

/**
 * Legacy `/messages` entry point.
 *
 * The product no longer ships a standalone "messages inbox". Conversations
 * are scoped to the project (job) they belong to, and are rendered in two
 * places that share the same store:
 *
 *   1. The workspace project chat panel (`/client/workspace`, `/editor/workspace`)
 *   2. The floating bottom-right widget (opened from anywhere via
 *      `chatStore.openWidget(jobId, peer)`)
 *
 * If this page is hit with `?freelancerId=X` (legacy) or `?jobId=X`, we try
 * to open the widget for that conversation and forward the user to their
 * workspace (which already shows the same thread). If we can't resolve a
 * jobId, we just send them to the workspace.
 */
export default function ChatInterface() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdParam = params.get("jobId");
    const freelancerIdParam = params.get("freelancerId");
    const target = user?.role === "FREELANCER" ? "/editor/workspace" : "/client/workspace";

    const open = async () => {
      if (jobIdParam) {
        chatStore.openWidget(Number(jobIdParam), null);
        navigate(target, { replace: true });
        return;
      }

      if (freelancerIdParam && user?.role === "CLIENT") {
        try {
          const res = await axiosInstance.get("/jobs", {
            params: { page: 1, limit: 50 },
          });
          const jobs = res.data?.data?.jobs || [];
          const match = jobs.find(
            (j) => Number(j.freelancer_id || j.freelancerId) === Number(freelancerIdParam)
          );
          if (match) {
            chatStore.openWidget(match.id, {
              id: Number(freelancerIdParam),
              firstname: match.freelancer?.firstname,
              lastname: match.freelancer?.lastname,
              avatar: match.freelancer?.profilePicture,
            });
          }
        } catch {
          /* fall through to navigation */
        }
      }
      navigate(target, { replace: true });
    };

    open();
  }, [location.search, navigate, user]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
      Opening conversation…
    </div>
  );
}
