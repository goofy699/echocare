import { Shield } from "lucide-react";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
        <Shield className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="text-xl font-bold text-foreground">SHA</span>


    </div>
  );
};
