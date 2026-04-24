import { useState, useEffect, useRef } from "react";
import {
  User,
  MapPin,
  Mail,
  Calendar,
  Edit,
  CheckCircle,
  XCircle,
  AtSign,
  Briefcase,
  X,
  Upload,
  Trash2,
  Save,
} from "lucide-react";
import axiosInstance from "../../utils/axios" // Adjust path to your axios instance

export default function ClientProfile() {
  const [profile, setProfile] = useState(null); // Initial state is null until fetched
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch profile data from API with caching
  // src/pages/ClientProfile.jsx (or Page.jsx)
useEffect(() => {
    // FIX M13: profile contains PII (email, company, address). Never persist to
    // localStorage where it can be exfiltrated via XSS or read by other tabs.
    // Always go to the API; React Query caching is fine, but disk caching is not.
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/users/me");
        const fetchedProfile = response.data.data;
        setProfile(fetchedProfile);
        setEditedProfile(fetchedProfile);
        setImagePreview(fetchedProfile.profilePicture || null);

        try {
          localStorage.removeItem("clientProfile");
        } catch {
          /* ignore — older clients may not have it */
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `Joined ${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`;
  };

  // Toggle edit mode and save changes
  // src/pages/ClientProfile.jsx
const handleEditToggle = async () => {
    if (isEditing) {
      try {
        const formData = new FormData();
        // Only append fields that have changed or are relevant
        const fieldsToUpdate = [
          "firstname",
          "lastname",
          "email",
          "country",
          "username",
          "bio",
          "company",
          "companyEmail",
        ];
        fieldsToUpdate.forEach((key) => {
          if (editedProfile[key] !== undefined && editedProfile[key] !== null) {
            formData.append(key, editedProfile[key]);
          }
        });
        if (fileInputRef.current?.files[0]) {
          formData.append("profilePicture", fileInputRef.current.files[0]);
        }

        const response = await axiosInstance.put("/users/update", formData);
        const updatedProfile = response.data.data;
        setProfile(updatedProfile);
        setImagePreview(updatedProfile.profilePicture || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save changes.");
      }
    }
    setIsEditing(!isEditing);
  };
  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Trigger file input click
  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove profile image
  const removeImage = () => {
    setImagePreview(null);
    setEditedProfile((prev) => ({ ...prev, profilePicture: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
        <p className="text-red-600">{error || "Profile data not available"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Floating Edit Button */}
        <div className="fixed bottom-8 right-8 z-10 flex gap-3">
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="p-4 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <X size={24} />
            </button>
          )}
          <button
            onClick={handleEditToggle}
            className={`p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
              isEditing ? "bg-purple-500 hover:bg-purple-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
          >
            {isEditing ? <Save size={24} /> : <Edit size={24} />}
          </button>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6">
            <div
              className={`relative w-40 h-40 rounded-full overflow-hidden shadow-xl border-4 border-white ${isEditing ? "cursor-pointer group" : ""}`}
              onClick={handleImageClick}
            >
              {imagePreview || profile.profilePicture ? (
                <>
                  <img
                    src={imagePreview || profile.profilePicture}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={24} className="text-white" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                  <User size={64} className="text-white" />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={24} className="text-white" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {isEditing && (imagePreview || profile.profilePicture) && (
              <button
                onClick={removeImage}
                className="absolute bottom-0 right-0 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-md"
              >
                <Trash2 size={16} />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          <div className="text-center">
            {isEditing ? (
              <div className="flex justify-center space-x-2 mb-1">
                <input
                  type="text"
                  name="firstname"
                  value={editedProfile.firstname}
                  onChange={handleInputChange}
                  className="text-4xl font-bold text-slate-800 border-b-2 border-purple-300 focus:border-purple-500 outline-none bg-transparent text-center w-40"
                />
                <input
                  type="text"
                  name="lastname"
                  value={editedProfile.lastname}
                  onChange={handleInputChange}
                  className="text-4xl font-bold text-slate-800 border-b-2 border-purple-300 focus:border-purple-500 outline-none bg-transparent text-center w-40"
                />
              </div>
            ) : (
              <h1 className="text-4xl font-bold text-slate-800 mb-1">
                {profile.firstname} {profile.lastname}
              </h1>
            )}

            {isEditing ? (
              <div className="flex items-center justify-center mt-2 mb-3">
                <AtSign size={16} className="text-slate-500" />
                <input
                  type="text"
                  name="username"
                  value={editedProfile.username || ""}
                  onChange={handleInputChange}
                  placeholder="Username"
                  className="text-slate-500 border-b border-slate-300 focus:border-emerald-500 outline-none bg-transparent text-center w-40"
                />
              </div>
            ) : profile.username ? (
              <div className="flex items-center justify-center text-slate-500 mb-3">
                <AtSign size={16} className="mr-1" />
                <span>{profile.username}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-center space-x-3 mb-4">
              <span
                className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${
                  profile.isActive ? "bg-purple-100 text-purple-800" : "bg-red-100 text-red-800"
                }`}
              >
                {profile.isActive ? <CheckCircle size={16} className="mr-1.5" /> : <XCircle size={16} className="mr-1.5" />}
                {profile.isActive ? "Active" : "Inactive"}
              </span>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-slate-800 text-white">
                CLIENT
              </span>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                {formatDate(profile.createdAt)}
              </span>
            </div>

            <div className="max-w-2xl mx-auto mb-12">
              {isEditing ? (
                <textarea
                  name="bio"
                  value={editedProfile.bio || ""}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself"
                  className="w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none min-h-[100px] text-slate-700 bg-white/50 backdrop-blur-sm"
                />
              ) : (
                <p className="text-slate-600 text-lg leading-relaxed">{profile.bio || "No bio provided"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Mail size={24} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-purple-900">Email</h3>
            </div>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={editedProfile.email}
                onChange={handleInputChange}
                className="text-base font-medium text-slate-800 border-b border-purple-300 focus:border-purple-500 outline-none bg-transparent w-full"
              />
            ) : (
              <p className="text-base text-slate-800 pl-9">{profile.email}</p>
            )}
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <MapPin size={24} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-purple-900">Country</h3>
            </div>
            {isEditing ? (
              <input
                type="text"
                name="country"
                value={editedProfile.country}
                onChange={handleInputChange}
                className="text-base font-medium text-slate-800 border-b border-purple-300 focus:border-purple-500 outline-none bg-transparent w-full"
              />
            ) : (
              <p className="text-base text-slate-800 pl-9">{profile.country}</p>
            )}
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Briefcase size={24} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-purple-900">Company</h3>
            </div>
            {isEditing ? (
              <input
                type="text"
                name="company"
                value={editedProfile.company || ""}
                onChange={handleInputChange}
                placeholder="Your company"
                className="text-base font-medium text-slate-800 border-b border-purple-300 focus:border-purple-500 outline-none bg-transparent w-full"
              />
            ) : (
              <p className="text-base text-slate-800 pl-9">{profile.company || "Not specified"}</p>
            )}
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Mail size={24} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-purple-900">Company Email</h3>
            </div>
            {isEditing ? (
              <input
                type="email"
                name="companyEmail"
                value={editedProfile.companyEmail || ""}
                onChange={handleInputChange}
                placeholder="Your company email"
                className="text-base font-medium text-slate-800 border-b border-purple-300 focus:border-purple-500 outline-none bg-transparent w-full"
              />
            ) : (
              <p className="text-base text-slate-800 pl-9">{profile.companyEmail || "Not specified"}</p>
            )}
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Calendar size={24} className="text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-purple-900">Member Since</h3>
            </div>
            <p className="text-base text-slate-800 pl-9">{formatDate(profile.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}