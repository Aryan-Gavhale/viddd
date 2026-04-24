import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const ProfileCompletionModal = ({ onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleYes = () => {
    navigate("/create-profile");
    onClose();
  };

  const handleSkip = () => {
    onClose(true);
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Complete your profile"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
        <p className="mb-6">Please complete your freelancer profile to start working!</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSkip}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Skip
          </button>
          <button
            onClick={handleYes}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;