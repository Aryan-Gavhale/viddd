import type { FreelancerProfileRow } from "../types/index.js";

const isFreelancerProfileComplete = (freelancerProfile: FreelancerProfileRow): boolean => {
  return (
    Boolean(freelancerProfile.city) &&
    Boolean(freelancerProfile.state) &&
    Boolean(freelancerProfile.jobTitle) &&
    Boolean(freelancerProfile.overview) &&
    Array.isArray(freelancerProfile.skills) &&
    freelancerProfile.skills.length > 0 &&
    freelancerProfile.availabilityStatus !== "UNAVAILABLE"
  );
};

export { isFreelancerProfileComplete };
