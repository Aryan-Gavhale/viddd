import type { FreelancerProfileRow } from "../types/index.js";

const isFreelancerProfileComplete = (freelancerProfile: FreelancerProfileRow): boolean => {
  return (
    Boolean(freelancerProfile.city) &&
    Boolean(freelancerProfile.pinCode) &&
    Boolean(freelancerProfile.state) &&
    Boolean(freelancerProfile.jobTitle) &&
    Boolean(freelancerProfile.overview) &&
    freelancerProfile.skills.length > 0 &&
    freelancerProfile.minimumRate != null &&
    freelancerProfile.maximumRate != null &&
    freelancerProfile.weeklyHours != null &&
    freelancerProfile.availabilityStatus !== "UNAVAILABLE"
  );
};

export { isFreelancerProfileComplete };
