import { NavLink, Outlet } from "react-router-dom";
import { Home, History, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navigationItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/history", icon: History, label: "History" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

const NavLinks = ({ isMobile }: { isMobile: boolean }) => (
  <>
    {navigationItems.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            { "bg-muted text-primary": isActive },
            isMobile ? "flex-col justify-center text-xs h-16" : ""
          )
        }
      >
        <Icon className="h-5 w-5" />
        {isMobile ? <span>{label}</span> : label}
      </NavLink>
    ))}
  </>
);

const DesktopLayout = () => (
  <div className="hidden border-r bg-muted/40 md:block">
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          <span className="">Crypto AI Analyzer</span>
        </NavLink>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <NavLinks isMobile={false} />
        </nav>
      </div>
    </div>
  </div>
);

const MobileLayout = () => (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background md:hidden">
        <div className="grid h-16 grid-cols-3">
            <NavLinks isMobile={true} />
        </div>
    </nav>
);

const Layout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DesktopLayout />
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      {isMobile && <MobileLayout />}
    </div>
  );
};

export default Layout;