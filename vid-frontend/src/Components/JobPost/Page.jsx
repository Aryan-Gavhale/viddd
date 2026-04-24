import { useState } from "react";
import { Upload, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "./button";
import { Dropdown } from "./dropdown";
import axiosInstance from "../../utils/axios";

const CATEGORIES = [
  { value: "wedding", label: "Wedding Videos" },
  { value: "corporate", label: "Corporate Videos" },
  { value: "social", label: "Social Media Content" },
  { value: "music", label: "Music Videos" },
];

const WORK_LEVELS = ["EASY", "INTERMEDIATE", "HARD"];
const DURATIONS = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"];
const KEY_RESPONSIBILITIES = ["Video Production", "Color Grading", "Effects", "Transitions"];
const REQUIRED_SKILLS = ["Video Editing", "Color Correction", "Sound Design", "Motion Graphics"];
const TOOLS = ["Adobe Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "After Effects"];

export default function JobPosting() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: [],
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    jobDifficulty: "",
    projectLength: "",
    keyResponsibilities: [],
    requiredSkills: [],
    tools: [],
    scope: "",
    name: "",
    email: "",
    company: "",
    note: "",
    videoFile: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!formData.title) newErrors.title = "Job title is required";
      if (!formData.description) newErrors.description = "Job description is required";
      if (formData.category.length === 0) newErrors.category = "At least one category is required";
      if (!formData.jobDifficulty) newErrors.jobDifficulty = "Job difficulty is required";
      if (!formData.projectLength) newErrors.projectLength = "Project length is required";
    } else if (currentStep === 2) {
      if (!formData.budgetMin || !formData.budgetMax) {
        newErrors.budget = "Budget range is required";
      } else if (Number.parseFloat(formData.budgetMin) >= Number.parseFloat(formData.budgetMax)) {
        newErrors.budget = "Minimum budget must be less than maximum budget";
      } else if (Number.parseFloat(formData.budgetMin) < 0 || Number.parseFloat(formData.budgetMax) < 0) {
        newErrors.budget = "Budget cannot be negative";
      }
      if (!formData.deadline) {
        newErrors.deadline = "Deadline is required";
      } else if (new Date(formData.deadline) < new Date().setHours(0, 0, 0, 0)) {
        newErrors.deadline = "Deadline cannot be in the past";
      }
      if (formData.requiredSkills.length === 0) newErrors.requiredSkills = "At least one skill is required";
      if (!formData.scope) newErrors.scope = "Project scope is required";
    } else if (currentStep === 3) {
      if (!formData.name) newErrors.name = "Your name is required";
      if (!formData.email) newErrors.email = "Email address is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    setStep((s) => s - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "budgetMin" && value !== "") {
      const numValue = Number.parseFloat(value);
      if (numValue < 0) {
        setFormData((prev) => ({ ...prev, [name]: "0" }));
        return;
      }
      if (formData.budgetMax && numValue >= Number.parseFloat(formData.budgetMax)) {
        setErrors((prev) => ({ ...prev, budget: "Minimum budget must be less than maximum budget" }));
      } else {
        setErrors((prev) => ({ ...prev, budget: "" }));
      }
    } else if (name === "budgetMax" && value !== "") {
      const numValue = Number.parseFloat(value);
      if (numValue < 0) {
        setFormData((prev) => ({ ...prev, [name]: "0" }));
        return;
      }
      if (formData.budgetMin && Number.parseFloat(formData.budgetMin) >= numValue) {
        setErrors((prev) => ({ ...prev, budget: "Minimum budget must be less than maximum budget" }));
      } else {
        setErrors((prev) => ({ ...prev, budget: "" }));
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleDropdownChange = (name) => (selected) => {
    const value = ["jobDifficulty", "projectLength"].includes(name) ? selected[0] || "" : selected;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("video/")) {
      setFormData((prev) => ({ ...prev, videoFile: file }));
      setErrors((prev) => ({ ...prev, videoFile: "" }));
    } else {
      setErrors((prev) => ({ ...prev, videoFile: "Please upload a valid video file" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return; // Only validate up to step 3, as step 4 is preview

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "videoFile" && value) {
          formDataToSend.append(key, value);
        } else if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value));
        } else if (value !== "") {
          formDataToSend.append(key, value);
        }
      });

      const payloadPreview = {};
      for (const [key, value] of formDataToSend.entries()) {
        payloadPreview[key] = value;
      }
      console.log("Sending payload:", payloadPreview);

      const response = await axiosInstance.post("/jobs", formDataToSend);

      console.log("Response data:", response.data);
      alert("Job posted successfully!");
      setFormData({
        title: "",
        description: "",
        category: [],
        budgetMin: "",
        budgetMax: "",
        deadline: "",
        jobDifficulty: "",
        projectLength: "",
        keyResponsibilities: [],
        requiredSkills: [],
        tools: [],
        scope: "",
        name: "",
        email: "",
        company: "",
        note: "",
        videoFile: null,
      });
      setStep(1);
    } catch (error) {
      console.error("Submission error:", error);
      console.error("Full error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || "Failed to post job";
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-800">Basic Information</span>
            <span className="ml-2 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">Required</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-800">Project Details</span>
            <span className="ml-2 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">Required</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-800">Contact Information</span>
            <span className="ml-2 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">Required</span>
          </div>
        );
      case 4:
        return <span className="text-xl font-semibold text-gray-800">Job Preview</span>;
      default:
        return "";
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: "Basic Info" },
      { number: 2, label: "Pricing" },
      { number: 3, label: "Media" },
      { number: 4, label: "Additional" },
    ];

    return (
      <div className="flex justify-center mb-8">
        {steps.map((s, index) => (
          <div key={s.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step === s.number
                    ? "bg-purple-600 text-white"
                    : step > s.number
                    ? "bg-purple-100 text-purple-600 border border-purple-200"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                } font-medium`}
              >
                {s.number}
              </div>
              <span className={`text-xs mt-2 ${step === s.number ? "text-purple-600 font-medium" : "text-gray-500"}`}>
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-24 h-0.5 mx-1 ${step > s.number ? "bg-purple-200" : "bg-gray-200"}`}></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Job Title</h3>
            <p className="text-gray-700">{formData.title || "Not specified"}</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Category</h3>
            <p className="text-gray-700">{formData.category.join(", ") || "Not specified"}</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Job Difficulty</h3>
            <p className="text-gray-700">{formData.jobDifficulty || "Not specified"}</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Project Length</h3>
            <p className="text-gray-700">{formData.projectLength || "Not specified"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Budget</h3>
            <p className="text-gray-700">
              ${formData.budgetMin || "0"} - ${formData.budgetMax || "0"}
            </p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Deadline</h3>
            <p className="text-gray-700">{formData.deadline || "Not specified"}</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Contact</h3>
            <p className="text-gray-700">{formData.name || "Not specified"}</p>
            <p className="text-gray-500">{formData.email || "Not specified"}</p>
            {formData.company && <p className="text-gray-500 mt-1">{formData.company}</p>}
          </div>

          <div className="border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Video</h3>
            <p className="text-gray-700">{formData.videoFile ? formData.videoFile.name : "None"}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 p-4 rounded-lg mt-6">
        <h3 className="font-medium text-gray-800 mb-2">Description</h3>
        <p className="text-gray-700 whitespace-pre-line">{formData.description || "Not specified"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="border border-gray-200 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Key Responsibilities</h3>
          <p className="text-gray-700">{formData.keyResponsibilities.join(", ") || "Not specified"}</p>
        </div>

        <div className="border border-gray-200 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Required Skills</h3>
          <p className="text-gray-700">{formData.requiredSkills.join(", ") || "Not specified"}</p>
        </div>

        <div className="border border-gray-200 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Tools</h3>
          <p className="text-gray-700">{formData.tools.join(", ") || "Not specified"}</p>
        </div>
      </div>

      <div className="border border-gray-200 p-4 rounded-lg mt-6">
        <h3 className="font-medium text-gray-800 mb-2">Project Scope</h3>
        <p className="text-gray-700 whitespace-pre-line">{formData.scope || "Not specified"}</p>
      </div>

      {formData.note && (
        <div className="border border-gray-200 p-4 rounded-lg mt-6">
          <h3 className="font-medium text-gray-800 mb-2">Additional Notes</h3>
          <p className="text-gray-700 whitespace-pre-line">{formData.note}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Video Editing Job</h1>
          <p className="text-gray-600">Fill out the form below to post your video editing job and find the perfect freelancer.</p>
        </div>

        {renderStepIndicator()}

        <div className="border border-gray-200 rounded-lg p-8">
          <div className="mb-6">
            {getStepTitle()}
            {step === 1 && (
              <p className="text-gray-600 text-sm mt-2">
                Let clients know what you offer and why they should choose you.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Job Title
                    </label>
                    <span className="text-xs text-gray-500">{formData.title.length}/60</span>
                  </div>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Professional YouTube Video Editing"
                    maxLength={60}
                    className={`w-full px-3 py-2 border ${
                      errors.title ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                  />
                  {errors.title ? (
                    <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">
                      A catchy title helps your project stand out and appear in search results.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Dropdown
                    label=""
                    options={CATEGORIES.map((c) => c.label)}
                    selectedOptions={formData.category}
                    onChange={handleDropdownChange("category")}
                    error={errors.category}
                  />
                  {errors.category ? (
                    <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">Choose a category to help clients find your project.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="jobDifficulty" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Difficulty
                    </label>
                    <Dropdown
                      label=""
                      options={WORK_LEVELS}
                      selectedOptions={[formData.jobDifficulty]}
                      onChange={handleDropdownChange("jobDifficulty")}
                      error={errors.jobDifficulty}
                    />
                    {errors.jobDifficulty && <p className="text-red-500 text-xs mt-1">{errors.jobDifficulty}</p>}
                  </div>

                  <div>
                    <label htmlFor="projectLength" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Length
                    </label>
                    <Dropdown
                      label=""
                      options={DURATIONS}
                      selectedOptions={[formData.projectLength]}
                      onChange={handleDropdownChange("projectLength")}
                      error={errors.projectLength}
                    />
                    {errors.projectLength && <p className="text-red-500 text-xs mt-1">{errors.projectLength}</p>}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <span className="text-xs text-gray-500">{formData.description.length}/1000</span>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the job in detail..."
                    rows={5}
                    maxLength={1000}
                    className={`w-full px-3 py-2 border ${
                      errors.description ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none`}
                  />
                  {errors.description ? (
                    <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">
                      Minimum 50 characters required. Be specific about what you offer.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="keyResponsibilities" className="block text-sm font-medium text-gray-700 mb-1">
                    Key Responsibilities
                  </label>
                  <Dropdown
                    label=""
                    options={KEY_RESPONSIBILITIES}
                    selectedOptions={formData.keyResponsibilities}
                    onChange={handleDropdownChange("keyResponsibilities")}
                  />
                  <p className="text-gray-500 text-xs mt-1">Select all that apply to your service.</p>
                </div>

                <div>
                  <label htmlFor="tools" className="block text-sm font-medium text-gray-700 mb-1">
                    Tools
                  </label>
                  <Dropdown
                    label=""
                    options={TOOLS}
                    selectedOptions={formData.tools}
                    onChange={handleDropdownChange("tools")}
                  />
                  <p className="text-gray-500 text-xs mt-1">Select the software tools you use for video editing.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Min ($)
                    </label>
                    <input
                      type="number"
                      id="budgetMin"
                      name="budgetMin"
                      value={formData.budgetMin}
                      onChange={handleChange}
                      min="0"
                      placeholder="Min"
                      className={`w-full px-3 py-2 border ${
                        errors.budget ? "border-red-300" : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                    />
                    {errors.budget && <p className="text-red-500 text-xs mt-1">{errors.budget}</p>}
                  </div>

                  <div>
                    <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Max ($)
                    </label>
                    <input
                      type="number"
                      id="budgetMax"
                      name="budgetMax"
                      value={formData.budgetMax}
                      onChange={handleChange}
                      min="0"
                      placeholder="Max"
                      className={`w-full px-3 py-2 border ${
                        errors.budget && !errors.budgetMin ? "border-red-300" : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                </div>
                <p className="text-gray-500 text-xs -mt-4">
                  Set a realistic budget range to attract qualified freelancers.
                </p>

                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className={`w-full px-3 py-2 border ${
                      errors.deadline ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                  />
                  {errors.deadline ? (
                    <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">When do you need this project completed?</p>
                  )}
                </div>

                <div>
                  <label htmlFor="requiredSkills" className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills
                  </label>
                  <Dropdown
                    label=""
                    options={REQUIRED_SKILLS}
                    selectedOptions={formData.requiredSkills}
                    onChange={handleDropdownChange("requiredSkills")}
                    error={errors.requiredSkills}
                  />
                  {errors.requiredSkills ? (
                    <p className="text-red-500 text-xs mt-1">{errors.requiredSkills}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">Select all skills that are required for this project.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Scope
                  </label>
                  <textarea
                    id="scope"
                    name="scope"
                    value={formData.scope}
                    onChange={handleChange}
                    placeholder="Describe the scope of work in detail..."
                    rows={4}
                    className={`w-full px-3 py-2 border ${
                      errors.scope ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none`}
                  />
                  {errors.scope ? (
                    <p className="text-red-500 text-xs mt-1">{errors.scope}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">
                      Be specific about deliverables, timeline, and expectations.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border ${
                        errors.name ? "border-red-300" : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border ${
                        errors.email ? "border-red-300" : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                    />
                    {errors.email ? (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-1">
                        We'll use this to contact you about your job posting.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    If you're hiring on behalf of a company, please provide the name.
                  </p>
                </div>

                <div>
                  <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Sample Video (Optional)
                  </label>
                  <div className="border border-dashed border-gray-300 rounded-lg p-6">
                    <label
                      htmlFor="videoFile"
                      className="flex flex-col items-center justify-center w-full h-32 cursor-pointer"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-10 w-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Upload a sample video (MP4, MOV, AVI)</p>
                      </div>
                      <input
                        type="file"
                        id="videoFile"
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    {formData.videoFile && (
                      <div className="mt-3 text-sm text-gray-600 flex items-center">
                        <span className="font-medium">Selected file:</span>
                        <span className="ml-2">{formData.videoFile.name}</span>
                      </div>
                    )}
                    {errors.videoFile && <p className="text-red-500 text-xs mt-2">{errors.videoFile}</p>}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Provide a sample video to help freelancers understand your requirements better.
                  </p>
                </div>

                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Note (Optional)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Add any additional information..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">Any other details that might be helpful for freelancers.</p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                {renderPreview()}
                <div className="flex justify-between pt-6 border-t mt-8">
                  <Button type="button" variant="outline" onClick={handlePrevious} className="flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex items-center"
                    >
                      Edit
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSubmitting ? "Posting..." : "Post Job"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step < 4 && (
              <div className="flex justify-between pt-6 border-t mt-8">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrevious} className="flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
                {step === 1 && <div></div>}
                <div className="ml-auto">
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center"
                  >
                    {step === 3 ? "Preview" : "Next"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="p-4 bg-red-50 rounded-lg mt-4">
                <p className="text-red-600 text-center">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}