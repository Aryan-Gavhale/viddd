import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { setUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";
import ProgressBar from "./progressBar";
import PersonalDetails from "./Personal";
import ProfessionalOverview from "./professional";
import SkillsPortfolio from "./skills";
import ToolsEquipmentCertifications from "./tools";
import RatesAvailability from "./rates";
import Preview from "./preview";

const steps = [
  { id: "personal", title: "Personal Details" },
  { id: "professional", title: "Professional Overview" },
  { id: "skills", title: "Skills & Portfolio" },
  { id: "experience", title: "Tools & Equipment" },
  { id: "rates", title: "Rates & Availability" },
];

export default function CreateProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const formDataRef = useRef(formData);

  const updateFormData = (newData) => {
    const merged = { ...formDataRef.current, ...newData };
    formDataRef.current = merged;
    setFormData(merged);
    return merged;
  };

  const handleNext = (stepData) => {
    updateFormData(stepData);
    setCompletedSteps([...completedSteps, steps[currentStep].id]);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo(0, 0);
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    setFieldErrors({});

    const d = formDataRef.current;
    try {
      const payload = {
        city: d.city || "",
        state: d.state || "",
        pinCode: String(d.pinCode || d.zipCode || ""),
        jobTitle: d.jobTitle || d.title || "",
        overview: d.overview || d.bio || "",
        skills: Array.isArray(d.skills) ? d.skills : [],
        languages: Array.isArray(d.languages) ? d.languages : [],
        tools: Array.isArray(d.tools) ? d.tools : [],
        certifications: Array.isArray(d.certifications)
          ? d.certifications
          : typeof d.certifications === "string" && d.certifications
            ? d.certifications.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        equipmentCameras: d.equipmentCameras || "",
        equipmentLenses: d.equipmentLenses || "",
        equipmentLighting: d.equipmentLighting || "",
        equipmentOther: d.equipmentOther || "",
        socialLinks: d.socialLinks && typeof d.socialLinks === "object" ? d.socialLinks : undefined,
        minimumRate: d.minimumRate != null && d.minimumRate !== "" ? Number(d.minimumRate) : null,
        maximumRate: d.maximumRate != null && d.maximumRate !== "" ? Number(d.maximumRate) : null,
        hourlyRate: d.hourlyRate != null && d.hourlyRate !== "" ? Number(d.hourlyRate) : null,
        weeklyHours: d.weeklyHours != null && d.weeklyHours !== "" ? Number(d.weeklyHours) : null,
        availabilityStatus: d.availabilityStatus || "FULL_TIME",
        experienceLevel: d.experienceLevel || "ENTRY",
      };

      // Remove undefined keys
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      console.log("Profile submit payload:", JSON.stringify(payload, null, 2));
      const response = await axiosInstance.patch("/users/me", payload);
      const updatedUser = response.data.data;
      console.log("Profile saved, isProfileComplete:", updatedUser.isProfileComplete);
      dispatch(setUser({ ...updatedUser, isProfileComplete: updatedUser.isProfileComplete ?? true }));
      navigate("/editor/dashboard", { replace: true });
    } catch (err) {
      console.error("Profile submit error:", err.response?.status, err.response?.data);
      const data = err.response?.data;
      const errors = data?.errors || data?.data?.errors || data?.data;
      if (errors && Array.isArray(errors) && errors.length > 0) {
        const fErrors = {};
        const messages = [];
        for (const e of errors) {
          if (typeof e === "string") {
            messages.push(e);
          } else if (e && typeof e === "object") {
            const field = e.field || e.path || "unknown";
            const msg = (e.message || "Invalid value").replace(/^"[^"]*"\s*/, "");
            fErrors[field] = msg;
            messages.push(`${field}: ${msg}`);
          }
        }
        setFieldErrors(fErrors);
        setSubmitError(messages.join(" | ") || data?.message || "Validation failed");
      } else {
        setSubmitError(data?.message || "Failed to save profile. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <PersonalDetails onNext={handleNext} data={formData} />;
      case 1:
        return <ProfessionalOverview onNext={handleNext} onPrev={handlePrev} data={formData} />;
      case 2:
        return <SkillsPortfolio onNext={handleNext} onPrev={handlePrev} data={formData} />;
      case 3:
        return <ToolsEquipmentCertifications onNext={handleNext} onPrev={handlePrev} data={formData} />;
      case 4:
        return <RatesAvailability onPrev={handlePrev} onSubmit={(stepData) => {
          updateFormData(stepData);
          setShowPreview(true);
        }} data={formData} />;
      default:
        return null;
    }
  };

  if (showPreview) {
    return (
      <Preview
        data={formDataRef.current}
        onEdit={() => setShowPreview(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        fieldErrors={fieldErrors}
      />
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-medium mb-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
            Required to access freelancer features
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">
            Fill in your details so clients can discover and hire you. All fields are needed to activate your freelancer account.
          </p>
        </div>

        <ProgressBar steps={steps} currentStep={currentStep} completedSteps={completedSteps} />

        <div className="mt-8 border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
