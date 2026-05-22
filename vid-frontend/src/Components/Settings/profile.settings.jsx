import { useEffect, useState } from "react";
import { Star, Award, Briefcase, Save, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { fetchMe, updateProfile } from "../../services/settingsApi";

export function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    bio: "",
    country: "",
    company: "",
    companyEmail: "",
    jobTitle: "",
  });
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchMe();
        if (!active || !me) return;
        setForm({
          firstname: me.firstname || "",
          lastname: me.lastname || "",
          username: me.username || "",
          bio: me.bio || "",
          country: me.country || "",
          company: me.company || "",
          companyEmail: me.companyEmail || "",
          jobTitle: me.freelancerProfile?.jobTitle || "",
        });
        setSkills(me.freelancerProfile?.skills || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username || undefined,
        bio: form.bio,
        country: form.country,
        company: form.company,
        companyEmail: form.companyEmail || undefined,
        jobTitle: form.jobTitle,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Profile Information</h2>
            <p className="text-violet-600 dark:text-violet-400 text-sm">
              Your professional information visible to clients
            </p>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name" icon={<Star className="h-4 w-4 mr-2 text-violet-500" />}>
              <input
                value={form.firstname}
                onChange={onChange("firstname")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Last name">
              <input
                value={form.lastname}
                onChange={onChange("lastname")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Username">
              <input
                value={form.username}
                onChange={onChange("username")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={onChange("country")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Company">
              <input
                value={form.company}
                onChange={onChange("company")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Company email">
              <input
                type="email"
                value={form.companyEmail}
                onChange={onChange("companyEmail")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Job title" icon={<Briefcase className="h-4 w-4 mr-2 text-violet-500" />}>
              <input
                value={form.jobTitle}
                onChange={onChange("jobTitle")}
                className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Bio" icon={<Briefcase className="h-4 w-4 mr-2 text-violet-500" />}>
            <textarea
              value={form.bio}
              onChange={onChange("bio")}
              rows={4}
              className="w-full rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Brief description of your skills and experience</p>
          </Field>

          {skills.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <Award className="h-4 w-4 mr-2 text-violet-500" />
                Skills & Expertise
              </label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Edit your skills from the freelancer onboarding wizard.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
