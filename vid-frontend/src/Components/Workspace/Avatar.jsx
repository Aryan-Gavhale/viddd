import { avatarColor, initials } from "./utils.js";

export function Avatar({ user, size = 40, className = "", ring = false }) {
  const px = `${size}px`;
  const src = user?.avatar || user?.profilePicture || null;
  const ringClass = ring
    ? "ring-2 ring-white dark:ring-gray-900"
    : "";

  if (src) {
    return (
      <img
        src={src}
        alt={user?.firstname || user?.name || "avatar"}
        className={`rounded-full object-cover flex-shrink-0 ${ringClass} ${className}`}
        style={{ width: px, height: px }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${avatarColor(
        user?.id || user?.email || user?.firstname
      )} ${ringClass} ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      title={user?.firstname || user?.email || ""}
    >
      {initials(user)}
    </div>
  );
}

export function AvatarStack({ users = [], max = 3, size = 28 }) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={u?.id || i} user={u} size={size} ring />
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-xs font-semibold ring-2 ring-white dark:ring-gray-900 dark:bg-gray-700 dark:text-gray-200"
          style={{ width: size, height: size }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
