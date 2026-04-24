import { Construction } from "lucide-react";

export default function ComingSoonPage({ title = "Coming Soon" }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <Construction className="w-16 h-16 mx-auto mb-4 text-purple-400" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500">
          This feature is under development. Check back soon!
        </p>
      </div>
    </div>
  );
}
