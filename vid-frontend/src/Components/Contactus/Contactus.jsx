import { useState, useRef } from "react";
import { UploadCloud, X, Send, Phone, Mail, MapPin, Clock } from "lucide-react";
import axiosInstance from "../../utils/axios"


export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    category: "TECHNICAL",
    subject: "",
    message: "",
    priority: "MEDIUM",
    contactMethod: "EMAIL",
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setApiError(null); // Clear API error on change
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Validate file types and sizes
      const invalidFiles = newFiles.filter(
        (file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024
      );

      if (invalidFiles.length > 0) {
        setErrors((prev) => ({
          ...prev,
          files: "Only images under 5MB are allowed",
        }));
        return;
      }

      // Clear file error
      if (errors.files) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.files;
          return newErrors;
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);

      // Create previews
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    // Prepare FormData for multipart/form-data
    const formDataToSend = new FormData();
    formDataToSend.append("firstName", formData.firstName);
    formDataToSend.append("lastName", formData.lastName);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("phone", formData.phone);
    formDataToSend.append("category", formData.category);
    formDataToSend.append("subject", formData.subject);
    formDataToSend.append("message", formData.message);
    formDataToSend.append("priority", formData.priority);
    formDataToSend.append("contactMethod", formData.contactMethod);

    // Append files
    files.forEach((file) => {
      formDataToSend.append("files", file);
    });

    try {
      const response = await axiosInstance.post("/contact", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setIsSubmitted(true);
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          category: "TECHNICAL",
          subject: "",
          message: "",
          priority: "MEDIUM",
          contactMethod: "EMAIL",
        });
        previews.forEach((preview) => URL.revokeObjectURL(preview));
        setFiles([]);
        setPreviews([]);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      if (error.response?.status === 400) {
        // Handle validation errors from backend
        setErrors(
          error.response.data.data?.errors.reduce((acc, err) => {
            if (err.includes("First name")) acc.firstName = err;
            if (err.includes("Last name")) acc.lastName = err;
            if (err.includes("Email")) acc.email = err;
            if (err.includes("Subject")) acc.subject = err;
            if (err.includes("Message")) acc.message = err;
            if (err.includes("category")) acc.category = err;
            if (err.includes("priority")) acc.priority = err;
            if (err.includes("contact method")) acc.contactMethod = err;
            return acc;
          }, {}) || { api: error.response.data.message }
        );
      } else {
        setApiError(error.response?.data?.message || "Failed to submit form. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-900 sm:text-5xl">
            Contact Us
          </h1>
          <div className="w-24 h-1 mx-auto mt-4 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full"></div>
          <p className="mt-6 text-xl text-gray-600">
            We're here to help. Reach out to us with any questions or concerns.
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/50">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Contact Form */}
            <div className="lg:col-span-2 p-10">
              {isSubmitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center animate-fadeIn">
                  <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-full p-5 mb-6 shadow-lg shadow-green-500/20">
                    <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank You!</h2>
                  <p className="text-gray-600 mb-8 max-w-md">
                    Your message has been sent successfully. Our team will review it and get back to you as soon as
                    possible.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/20 transform hover:scale-105"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {apiError && (
                    <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                      {apiError}
                    </div>
                  )}
                  <div className="text-2xl font-semibold text-gray-800 mb-8 border-b border-gray-200 pb-4">
                    Tell us about your issue
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name*
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                          errors.firstName ? "border-red-500" : "border-gray-200"
                        }`}
                      />
                      {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name*
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                          errors.lastName ? "border-red-500" : "border-gray-200"
                        }`}
                      />
                      {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address*
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                          errors.email ? "border-red-500" : "border-gray-200"
                        }`}
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number (optional)
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 border-gray-200"
                      />
                    </div>
                  </div>

                  {/* Issue Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                          errors.category ? "border-red-500" : "border-gray-200"
                        }`}
                      >
                        <option value="TECHNICAL">Technical Problem</option>
                        <option value="BILLING">Billing Issue</option>
                        <option value="ACCOUNT">Account Management</option>
                        <option value="FEATURE">Feature Request</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                          errors.priority ? "border-red-500" : "border-gray-200"
                        }`}
                      >
                        <option value="LOW">Low - Not urgent</option>
                        <option value="MEDIUM">Medium - Needs attention</option>
                        <option value="HIGH">High - Affecting my work</option>
                        <option value="CRITICAL">Critical - System down</option>
                      </select>
                      {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject*
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                        errors.subject ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message*
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ${
                        errors.message ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder="Please describe your issue in detail..."
                    ></textarea>
                    {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos (Optional)</label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-300 ${
                        errors.files ? "border-red-300" : "border-purple-200"
                      }`}
                      onClick={triggerFileInput}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                        multiple
                      />
                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-purple-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                    {errors.files && <p className="mt-1 text-sm text-red-600">{errors.files}</p>}

                    {/* Image Previews */}
                    {previews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative group image-preview-container">
                            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100">
                              <Image
                                src={preview || "/placeholder.svg"}
                                alt={`Preview ${index + 1}`}
                                width={200}
                                height={200}
                                className="object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preferred Contact Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="contactMethod"
                          value="EMAIL"
                          checked={formData.contactMethod === "EMAIL"}
                          onChange={handleChange}
                          className="form-radio h-5 w-5 text-purple-600"
                        />
                        <span className="ml-2 text-gray-700">Email</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="contactMethod"
                          value="PHONE"
                          checked={formData.contactMethod === "PHONE"}
                          onChange={handleChange}
                          className="form-radio h-5 w-5 text-purple-600"
                        />
                        <span className="ml-2 text-gray-700">Phone</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="contactMethod"
                          value="ANY"
                          checked={formData.contactMethod === "ANY"}
                          onChange={handleChange}
                          className="form-radio h-5 w-5 text-purple-600"
                        />
                        <span className="ml-2 text-gray-700">Either</span>
                      </label>
                    </div>
                    {errors.contactMethod && <p className="mt-1 text-sm text-red-600">{errors.contactMethod}</p>}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center px-8 py-4 border border-transparent rounded-full shadow-lg text-base font-medium text-white bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-purple-500/20"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-purple-700 to-purple-900 text-white p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-pattern opacity-10"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-8">Contact Information</h3>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <Phone className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <h4 className="font-semibold">Phone</h4>
                      <p className="mt-1">+1 (555) 123-4567</p>
                      <p className="text-purple-200 text-sm mt-1">Monday to Friday, 9am to 5pm EST</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Mail className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <h4 className="font-semibold">Email</h4>
                      <p className="mt-1">support@vidlancing.com</p>
                      <p className="text-purple-200 text-sm mt-1">We'll respond as soon as possible</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <h4 className="font-semibold">Office</h4>
                      <p className="mt-1">123 Video Editor Street</p>
                      <p className="mt-0.5">Creative City, ST 12345</p>
                      <p className="mt-0.5">United States</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <h4 className="font-semibold">Business Hours</h4>
                      <p className="mt-1">Monday - Friday: 9am - 5pm EST</p>
                      <p className="mt-0.5">Saturday - Sunday: Closed</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12">
                  <h4 className="font-semibold mb-4">Connect With Us</h4>
                  <div className="flex space-x-4">
                    <a
                      href="#"
                      className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-900/20"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-900/20"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-900/20"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-900/20"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}