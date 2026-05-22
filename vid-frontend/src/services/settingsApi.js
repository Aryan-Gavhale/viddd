/**
 * Settings API client.
 *
 * Single source of truth for every endpoint used by `Settings/*` and the
 * ClientDashboard `settings.jsx` tabs. Keeping these calls together makes
 * the panels themselves trivial to wire up and lets us swap the underlying
 * transport (e.g. inject a mock client in Storybook) in one place.
 */
import axios from "../utils/axios";

const unwrap = (res) => res?.data?.data ?? res?.data;

// ── Profile / account ─────────────────────────────────────────────────────
export async function fetchMe() {
  const res = await axios.get("/users/me");
  return unwrap(res);
}

export async function updateProfile(payload) {
  const res = await axios.patch("/users/me", payload);
  return unwrap(res);
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await axios.post("/users/me/password", { currentPassword, newPassword });
  return unwrap(res);
}

export async function requestEmailChange({ newEmail, currentPassword }) {
  const res = await axios.post("/users/me/email/change-request", { newEmail, currentPassword });
  return unwrap(res);
}

export async function deactivateAccount() {
  const res = await axios.delete("/users/me");
  return unwrap(res);
}

// ── Combined preferences (appearance + video + privacy) ───────────────────
export async function fetchPreferences() {
  const res = await axios.get("/users/me/preferences");
  return unwrap(res);
}

export async function updatePreferences(patch) {
  const res = await axios.patch("/users/me/preferences", patch);
  return unwrap(res);
}

// ── Notification preferences ──────────────────────────────────────────────
export async function fetchNotificationPrefs() {
  const res = await axios.get("/notifications/preferences");
  return unwrap(res);
}

export async function updateNotificationPrefs(patch) {
  const res = await axios.patch("/notifications/preferences", patch);
  return unwrap(res);
}

// ── Payment methods + Stripe SetupIntent ──────────────────────────────────
export async function listPaymentMethods() {
  const res = await axios.get("/billing/payment-methods");
  return unwrap(res);
}

export async function createSetupIntent() {
  const res = await axios.post("/billing/payment-methods/setup-intent");
  return unwrap(res);
}

export async function savePaymentMethod({ paymentMethodId, setAsDefault = false }) {
  const res = await axios.post("/billing/payment-methods", { paymentMethodId, setAsDefault });
  return unwrap(res);
}

export async function setDefaultPaymentMethod(id) {
  const res = await axios.post(`/billing/payment-methods/${id}/default`);
  return unwrap(res);
}

export async function deletePaymentMethod(id) {
  const res = await axios.delete(`/billing/payment-methods/${id}`);
  return unwrap(res);
}

// ── Billing profile (tax + address) ──────────────────────────────────────
export async function fetchBillingProfile() {
  const res = await axios.get("/billing/profile");
  return unwrap(res);
}

export async function updateBillingProfile(patch) {
  const res = await axios.put("/billing/profile", patch);
  return unwrap(res);
}

export async function exportInvoices() {
  const res = await axios.get("/billing/invoices/export", { responseType: "blob" });
  return res.data;
}

// ── Stripe Connect (freelancer payouts) ──────────────────────────────────
export async function getConnectStatus() {
  const res = await axios.get("/billing/connect/status");
  return unwrap(res);
}

export async function startConnectOnboarding() {
  const res = await axios.post("/billing/connect/onboard");
  return unwrap(res);
}

export async function getConnectDashboardLink() {
  const res = await axios.get("/billing/connect/dashboard");
  return unwrap(res);
}

// ── 2FA ──────────────────────────────────────────────────────────────────
export async function get2faStatus() {
  const res = await axios.get("/security/2fa/status");
  return unwrap(res);
}

export async function setup2fa() {
  const res = await axios.post("/security/2fa/setup");
  return unwrap(res);
}

export async function verify2faSetup({ code }) {
  const res = await axios.post("/security/2fa/verify-setup", { code });
  return unwrap(res);
}

export async function disable2fa({ currentPassword, code }) {
  const res = await axios.post("/security/2fa/disable", { currentPassword, code });
  return unwrap(res);
}

export async function complete2faLogin({ mfaToken, code }) {
  const res = await axios.post("/security/2fa/login", { mfaToken, code });
  return unwrap(res);
}

// ── Sessions ─────────────────────────────────────────────────────────────
export async function listSessions() {
  const res = await axios.get("/security/sessions");
  return unwrap(res);
}

export async function revokeSession(jti) {
  const res = await axios.delete(`/security/sessions/${encodeURIComponent(jti)}`);
  return unwrap(res);
}

export async function revokeAllOtherSessions() {
  const res = await axios.delete("/security/sessions");
  return unwrap(res);
}

// ── Connected accounts (OAuth) ───────────────────────────────────────────
export async function listConnectedAccounts() {
  const res = await axios.get("/connected-accounts");
  return unwrap(res);
}

export async function startOAuthConnect(provider) {
  const res = await axios.get(`/connected-accounts/start/${provider}`);
  return unwrap(res);
}

export async function disconnectAccount(provider) {
  const res = await axios.delete(`/connected-accounts/${provider}`);
  return unwrap(res);
}

// ── Account hard-delete + GDPR export ─────────────────────────────────────
export async function requestAccountDeletion({ currentPassword, reason }) {
  const res = await axios.post("/users/me/delete-request", { currentPassword, reason });
  return unwrap(res);
}

export async function cancelAccountDeletion() {
  const res = await axios.post("/users/me/delete-request/cancel");
  return unwrap(res);
}

export async function requestDataExport() {
  const res = await axios.post("/users/me/export");
  return unwrap(res);
}

// ── Team members (clients) ───────────────────────────────────────────────
export async function listTeamMembers() {
  const res = await axios.get("/team/members");
  return unwrap(res);
}

export async function inviteTeamMember({ email, role }) {
  const res = await axios.post("/team/members/invite", { email, role });
  return unwrap(res);
}

export async function updateTeamMemberRole(id, role) {
  const res = await axios.patch(`/team/members/${id}`, { role });
  return unwrap(res);
}

export async function removeTeamMember(id) {
  const res = await axios.delete(`/team/members/${id}`);
  return unwrap(res);
}

export async function acceptTeamInvite(token) {
  const res = await axios.get(`/team/members/accept?token=${encodeURIComponent(token)}`);
  return unwrap(res);
}

// ── Password reset (forgot flow) ─────────────────────────────────────────
export async function passwordForgot(email) {
  const res = await axios.post("/security/password/forgot", { email });
  return unwrap(res);
}

export async function passwordReset({ token, newPassword }) {
  const res = await axios.post("/security/password/reset", { token, newPassword });
  return unwrap(res);
}
