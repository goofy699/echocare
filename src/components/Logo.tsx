import LogoAsset from "@/assets/AlzHealth Logo with Overlapping Brain Design.svg";

type LogoProps = {
  className?: string;
  hideText?: boolean;
  iconClassName?: string;
};

export const Logo = ({ className = "", hideText = false, iconClassName = "h-10 w-10" }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={LogoAsset}
        alt="EchoCare logo"
        className={`${iconClassName} object-contain`}
        loading="lazy"
      />
      {!hideText && <span className="text-xl font-bold text-foreground">EchoCare</span>}
    </div>
  );
};
