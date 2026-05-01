import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  DollarSign,
  Clock,
  RefreshCw,
  Tag,
  FileText,
  Film,
  Check,
  ChevronLeft,
  Save,
} from "lucide-react";
import axiosInstance from "../../utils/axios";

export default function PreviewGig() {
  const { state } = useLocation(); // Get formData from navigation state
  const navigate = useNavigate();
  const formData = state?.formData || {
    pricing: [],
    addOns: [],
    tags: [],
    sampleWork: [],
    requirements: '',
    description: '',
    title: '',
    category: '',
    thumbnail: null,
    thumbnailPreview: null,
    faqs: []
  };

  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
  };

  // Handle gig submission (Publish or Draft)
  const handleSubmit = async (status) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const gigData = new FormData();
    gigData.append("title", formData.title);
    gigData.append("category", formData.category);
    gigData.append("description", formData.description);
    gigData.append("pricing", JSON.stringify(formData.pricing));
    gigData.append("deliveryTime", formData.pricing[0].deliveryTime);
    gigData.append(
      "revisionCount",
      formData.pricing[0].revisions === "Unlimited" ? null : formData.pricing[0].revisions
    );
    gigData.append("tags", JSON.stringify(formData.tags));
    gigData.append("requirements", formData.requirements);
    gigData.append("faqs", JSON.stringify(formData.faqs));
    gigData.append("packageDetails", JSON.stringify(formData.addOns));
    gigData.append("status", status); // "ACTIVE" or "DRAFT"

    if (formData.thumbnail) {
      gigData.append("thumbnail", formData.thumbnail);
    }

    formData.sampleWork.forEach((sample, index) => {
      gigData.append(`sampleMedia[${index}][mediaUrl]`, sample.file);
      gigData.append(`sampleMedia[${index}][mediaType]`, sample.type);
    });

    try {
      const response = await axiosInstance.post("/gigs/", gigData);

      console.log(`Gig ${status === "ACTIVE" ? "published" : "saved as draft"} successfully:`, response.data);
      navigate("/editor/gigs?success=true");
    } catch (error) {
      console.error(`Error ${status === "ACTIVE" ? "publishing" : "saving"} gig:`, error);
      setSubmissionError(
        error.response?.data?.message || `Failed to ${status === "ACTIVE" ? "publish" : "save"} gig. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Gig Preview</h1>
      <p className="text-gray-600 mb-8">Review your gig details before publishing or saving as a draft.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">
        {/* Basic Information */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Basic Information</h2>
          <div>
            <h3 className="font-medium text-gray-700">Title</h3>
            <p className="text-gray-600">{formData.title || "Not provided"}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700">Category</h3>
            <p className="text-gray-600">{formData.category || "Not provided"}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {formData.description || "No description provided."}
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Pricing Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formData.pricing?.map((tier, index) => (
              <div
                key={index}
                className={`border-2 rounded-xl p-5 ${
                  index === 0
                    ? "border-purple-200 bg-purple-50"
                    : index === 1
                    ? "border-blue-200 bg-blue-50"
                    : "border-teal-200 bg-teal-50"
                }`}
              >
                <h3 className="font-semibold text-gray-800 mb-2">{tier.name}</h3>
                <p className="flex items-center gap-1 text-gray-600">
                  <DollarSign size={16} /> ₹{formatCurrency(tier.price)}
                </p>
                <p className="flex items-center gap-1 text-gray-600">
                  <Clock size={16} /> {tier.deliveryTime} {Number(tier.deliveryTime) === 1 ? "day" : "days"}
                </p>
                <p className="flex items-center gap-1 text-gray-600">
                  <RefreshCw size={16} /> {tier.revisions} revisions
                </p>
                <p className="text-gray-600 mt-2">{tier.description || "No description"}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Add-Ons */}
        {formData.addOns?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Add-Ons</h2>
            {formData.addOns.map((addOn, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700">{addOn.name}</h3>
                <p className="flex items-center gap-1 text-gray-600">
                  <DollarSign size={16} /> ₹{formatCurrency(addOn.price)}
                </p>
                <p className="text-gray-600">{addOn.description}</p>
              </div>
            ))}
          </section>
        )}

        {/* Thumbnail */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Thumbnail</h2>
          {formData.thumbnailPreview ? (
            formData.thumbnail.type.includes("video") ? (
              <video src={formData.thumbnailPreview} className="w-full max-w-md h-auto rounded-lg" controls />
            ) : (
              <img
                src={formData.thumbnailPreview}
                alt="Gig thumbnail"
                className="w-full max-w-md h-auto rounded-lg object-cover"
              />
            )
          ) : (
            <p className="text-gray-600">No thumbnail provided.</p>
          )}
        </section>

        {/* Tags */}
        {formData.tags?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  <Tag size={14} className="inline mr-1" /> {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Requirements */}
        {formData.requirements && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Requirements</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{formData.requirements}</p>
          </section>
        )}

        {/* Sample Work */}
        {formData.sampleWork?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Sample Work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.sampleWork.map((sample, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {sample.type === "video" ? (
                    <video src={sample.preview} className="w-full h-48 object-cover" controls />
                  ) : (
                    <img
                      src={sample.preview}
                      alt={`Sample ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQs */}
        {formData.faqs?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">FAQs</h2>
            {formData.faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700">
                  <FileText size={16} className="inline mr-2" /> {faq.question}
                </h3>
                <p className="text-gray-600 mt-1">{faq.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* Submission Error */}
        {submissionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {submissionError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 pt-6">
          <button
            onClick={() => navigate("/editor/gigs/new", { state: { formData, step: 4 } })} // Return to Step 4
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={18} /> Edit
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit("DRAFT")}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> Save as Draft
            </button>
            <button
              onClick={() => handleSubmit("ACTIVE")}
              disabled={isSubmitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Publish Gig <Check size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}