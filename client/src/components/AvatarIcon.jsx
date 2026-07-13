import React from 'react';
import { User, Shield, Cat, Crown, Star, Smile, Briefcase, Flame, Zap, Heart, Moon } from 'lucide-react';
import versacePng from '../assets/versace.png';
import armaniPng from '../assets/Armani.png';

export const GithubIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
  </svg>
);

export const ReactIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="0" cy="0" r="2" fill={color}></circle>
    <g stroke={color} strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(60)"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(120)"></ellipse>
    </g>
  </svg>
);

export const ViteIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 410 404" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M399.641 43.1539L214.288 393.188C210.155 400.99 198.814 400.99 194.681 393.188L9.32832 43.1539C4.84378 34.6841 12.9231 25.4055 21.6663 28.9882L198.718 101.52C202.43 103.041 206.539 103.041 210.251 101.52L387.303 28.9882C396.046 25.4055 404.125 34.6841 399.641 43.1539Z" fill="url(#vite-grad-sidebar)" />
    <path d="M293.411 1.76185L208.627 122.188C206.565 125.118 202.404 125.118 200.342 122.188L115.558 1.76185C111.455 -4.06227 102.399 0.0818292 104.053 7.03965L149.332 197.433C150.312 201.554 154.512 203.955 158.423 202.668L199.191 189.261C202.646 188.125 206.323 188.125 209.778 189.261L250.546 202.668C254.457 203.955 258.657 201.554 259.637 197.433L304.916 7.03965C306.57 0.0818292 297.514 -4.06227 293.411 1.76185Z" fill="url(#vite-grad-2-sidebar)" />
    <defs>
      <linearGradient id="vite-grad-sidebar" x1="204.485" y1="389.273" x2="204.485" y2="44.2543" gradientUnits="userSpaceOnUse">
        <stop stopColor={color} stopOpacity="1" />
        <stop offset="1" stopColor={color} stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="vite-grad-2-sidebar" x1="204.485" y1="195.457" x2="204.485" y2="2.75628" gradientUnits="userSpaceOnUse">
        <stop stopColor={color} stopOpacity="1" />
        <stop offset="1" stopColor={color} stopOpacity="0.3" />
      </linearGradient>
    </defs>
  </svg>
);

export const NextIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M90 180C139.706 180 180 139.706 180 90C180 40.2944 139.706 0 90 0C40.2944 0 0 40.2944 0 90C0 139.706 40.2944 180 90 180ZM65.8694 65V124H76.2804L121.737 57.0674L113.626 51.579L65.8694 65ZM111.458 114.372L74.8878 65H65.8694V115H74.8878V76.8406L104.912 120.25L111.458 114.372Z" fill={color} />
    <path fillRule="evenodd" clipRule="evenodd" d="M115 65H124.018V115H115V65Z" fill={color} />
  </svg>
);

export const VueIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 256 221" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M204.8 0H256L128 220.8L0 0H51.2L128 132.48L204.8 0Z" fill={color} />
    <path d="M204.8 0H153.6L128 44.16L102.4 0H51.2L128 132.48L204.8 0Z" fill="rgba(255,255,255,0.4)" />
  </svg>
);

export const VersaceIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <div
    className={className}
    style={{
      width: size === 24 ? 32 : size * 1.6,
      height: size === 24 ? 32 : size * 1.6,
      backgroundColor: 'currentColor',
      maskImage: `url(${versacePng})`,
      WebkitMaskImage: `url(${versacePng})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      display: 'inline-block'
    }}
  />
);

export const ArmaniIcon = ({ size = 24, className = '' }) => (
  <div
    className={className}
    style={{
      width: size === 24 ? 32 : size * 1.6,
      height: size === 24 ? 32 : size * 1.6,
      backgroundColor: 'currentColor',
      maskImage: `url(${armaniPng})`,
      WebkitMaskImage: `url(${armaniPng})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      display: 'inline-block'
    }}
  />
);

export const AppleIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

export const NikeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z" />
  </svg>
);

export const AdidasIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m24 19.535-8.697-15.07-4.659 2.687 7.145 12.383Zm-8.287 0L9.969 9.59 5.31 12.277l4.192 7.258ZM4.658 14.723l2.776 4.812H1.223L0 17.41Z" />
  </svg>
);

export const MercedesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v10l8.66 5M12 12l-8.66 5" strokeWidth="2" />
  </svg>
);

export const BMWIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 .78C18.196.78 23.219 5.803 23.219 12c0 6.196-5.022 11.219-11.219 11.219C5.803 23.219.781 18.196.781 12S5.804.78 12 .78zm-.678.63c-.33.014-.66.042-.992.078l-.107 2.944a9.95 9.95 0 0 1 .71-.094l.07-1.988-.013-.137.043.13.664 1.489h.606l.664-1.488.04-.131-.01.137.07 1.988c.232.022.473.054.71.094l-.109-2.944a14.746 14.746 0 0 0-.992-.078l-.653 1.625-.023.12-.023-.12-.655-1.625zm6.696 1.824l-1.543 2.428c.195.15.452.371.617.522l1.453-.754.092-.069-.069.094-.752 1.453c.163.175.398.458.53.63l2.43-1.544a16.135 16.135 0 0 0-.46-.568L18.777 6.44l-.105.092.078-.115.68-1.356-.48-.48-1.356.68-.115.078.091-.106 1.018-1.539c-.18-.152-.351-.291-.57-.46zM5.5 3.785c-.36.037-.638.283-1.393 1.125a18.97 18.97 0 0 0-.757.914l2.074 1.967c.687-.76.966-1.042 1.508-1.613.383-.405.6-.87.216-1.317-.208-.242-.558-.295-.85-.175l-.028.01.01-.026a.7.7 0 0 0-.243-.734.724.724 0 0 0-.537-.15zm.006.615c.136-.037.277.06.308.2.032.14-.056.272-.154.382-.22.25-1.031 1.098-1.031 1.098l-.402-.383c.417-.51.861-.974 1.062-1.158a.55.55 0 0 1 .217-.139zM12 4.883a7.114 7.114 0 0 0-7.08 6.388v.002a7.122 7.122 0 0 0 8.516 7.697 7.112 7.112 0 0 0 5.68-6.97A7.122 7.122 0 0 0 12 4.885v-.002zm-5.537.242c.047 0 .096.013.14.043.088.059.128.16.106.26-.026.119-.125.231-.205.318l-1.045 1.12-.42-.4s.787-.832 1.045-1.099c.102-.106.168-.17.238-.205a.331.331 0 0 1 .14-.037zM12 5.818A6.175 6.175 0 0 1 18.182 12H12v6.182A6.175 6.175 0 0 1 5.818 12H12V5.818Z" />
  </svg>
);

export const AudiIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.848,7.848c-0.992,0-1.902,0.348-2.616,0.928c-0.714-0.58-1.624-0.928-2.616-0.928 c-0.992,0-1.902,0.348-2.616,0.928c-0.714-0.58-1.624-0.928-2.616-0.928c-0.992,0-1.902,0.348-2.616,0.928 c-0.714-0.58-1.624-0.928-2.616-0.928C1.859,7.848,0,9.707,0,12s1.859,4.152,4.152,4.152c0.992,0,1.902-0.348,2.616-0.928 c0.714,0.58,1.624,0.928,2.616,0.928c0.992,0,1.902-0.348,2.616-0.928c0.714,0.58,1.624,0.928,2.616,0.928 c0.992,0,1.902-0.348,2.616-0.928c0.714,0.58,1.624,0.928,2.616,0.928C22.141,16.152,24,14.293,24,12S22.141,7.848,19.848,7.848z M17.232,13.866c-0.376-0.526-0.598-1.17-0.598-1.866c0-0.696,0.222-1.34,0.598-1.866c0.376,0.526,0.598,1.17,0.598,1.866 C17.83,12.696,17.608,13.34,17.232,13.866z M12,13.866c-0.376-0.526-0.598-1.17-0.598-1.866c0-0.696,0.222-1.34,0.598-1.866 c0.376,0.526,0.598,1.17,0.598,1.866C12.598,12.696,12.376,13.34,12,13.866z M6.768,13.866C6.392,13.34,6.17,12.696,6.17,12 c0-0.696,0.222-1.34,0.598-1.866C7.144,10.66,7.366,11.304,7.366,12C7.366,12.696,7.144,13.34,6.768,13.866z M0.938,12 c0-1.775,1.439-3.214,3.214-3.214c0.736,0,1.414,0.248,1.956,0.665C5.56,10.154,5.232,11.039,5.232,12 c0,0.961,0.328,1.846,0.876,2.549c-0.542,0.416-1.22,0.665-1.956,0.665C2.377,15.214,0.938,13.775,0.938,12z M7.428,14.549 C7.976,13.846,8.304,12.961,8.304,12c0-0.961-0.328-1.846-0.876-2.549c0.542-0.416,1.22-0.665,1.956-0.665 c0.736,0,1.414,0.248,1.956,0.665c-0.549,0.704-0.876,1.588-0.876,2.549c0,0.961,0.328,1.846,0.876,2.549 c-0.542,0.416-1.22,0.665-1.956,0.665C8.648,15.214,7.97,14.966,7.428,14.549z M12.66,14.549c0.549-0.704,0.876-1.588,0.876-2.549 c0-0.961-0.328-1.846-0.876-2.55c0.542-0.416,1.22-0.665,1.956-0.665s1.414,0.248,1.956,0.665 c-0.549,0.704-0.876,1.588-0.876,2.549c0,0.961,0.328,1.846,0.876,2.549c-0.542,0.416-1.22,0.665-1.956,0.665 C13.88,15.214,13.202,14.966,12.66,14.549z M19.848,15.214c-0.736,0-1.414-0.248-1.956-0.665c0.548-0.704,0.876-1.588,0.876-2.549 c0-0.961-0.328-1.846-0.876-2.549c0.542-0.416,1.22-0.665,1.956-0.665c1.775,0,3.214,1.439,3.214,3.214 S21.623,15.214,19.848,15.214z" />
  </svg>
);

export const RolexIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 4l3 7 4-1-2 8H7l-2-8 4 1 3-7z" />
    <circle cx="12" cy="3" r="1.5" />
    <circle cx="16" cy="5" r="1.5" />
    <circle cx="8" cy="5" r="1.5" />
    <circle cx="20" cy="9" r="1.5" />
    <circle cx="4" cy="9" r="1.5" />
    <path d="M7 20h10v2H7z" />
  </svg>
);

export const ChanelIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
    <path d="M14 6a6 6 0 1 1 0 12M10 6a6 6 0 1 0 0 12" />
  </svg>
);

export const GucciIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
    <path d="M14 6a6 6 0 1 1 0 12h-2v-4M10 6a6 6 0 1 0 0 12h2v-4" />
  </svg>
);

export const avatarMap = {
  User, Shield, Cat, Crown, Star, Smile, Briefcase,
  React: ReactIcon, Github: GithubIcon, Vite: ViteIcon, Next: NextIcon, Vue: VueIcon,
  Flame, Zap, Heart, Moon,
  Versace: VersaceIcon, Armani: ArmaniIcon, Apple: AppleIcon, Nike: NikeIcon, Adidas: AdidasIcon,
  Mercedes: MercedesIcon, BMW: BMWIcon, Audi: AudiIcon, Rolex: RolexIcon, Chanel: ChanelIcon, Gucci: GucciIcon
};

export const avatarOptions = Object.keys(avatarMap).map(key => ({
  id: key,
  icon: avatarMap[key]
}));

export const AvatarIcon = ({ name, size = 24, color = "currentColor", className = '' }) => {
  const IconComponent = avatarMap[name] || User;
  return <IconComponent size={size} color={color} className={className} />;
};

export default AvatarIcon;
