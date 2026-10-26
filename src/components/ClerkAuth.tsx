import React, { createContext, useContext, useState, useEffect, ReactNode, FormEvent } from "react";
import {
  ClerkProvider as RealClerkProvider,
  SignedIn as RealSignedIn,
  SignedOut as RealSignedOut,
  SignInButton as RealSignInButton,
  UserButton as RealUserButton,
  useUser as useRealUser,
  useClerk as useRealClerk
} from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { User, LogOut, Key, ShieldAlert, LogIn, Sparkles, Check, ChevronDown } from "lucide-react";

// Read publishable key from env
const CLERK_PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;
// Check if the key is valid (not empty and not a placeholder)
const isKeyConfigured = !!CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY !== "YOUR_CLERK_PUBLISHABLE_KEY";

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  emailAddress: string;
}

interface CustomAuthContextType {
  isSignedIn: boolean;
  user: AuthUser | null;
  signIn: (email: string, firstName: string, lastName: string) => void;
  signOut: () => void;
  isRealClerk: boolean;
  isKeyConfigured: boolean;
}

const CustomAuthContext = createContext<CustomAuthContextType>({
  isSignedIn: false,
  user: null,
  signIn: () => {},
  signOut: () => {},
  isRealClerk: false,
  isKeyConfigured: false,
});

export function useCustomAuth() {
  return useContext(CustomAuthContext);
}

// Global state for theme passed to Clerk Provider
interface ClerkAuthWrapperProps {
  children: ReactNode;
  darkMode: boolean;
}

export function ClerkAuthWrapper({ children, darkMode }: ClerkAuthWrapperProps) {
  const [isSignedIn, setIsSignedIn] = useState(() => {
    return localStorage.getItem("cvpilot_auth_signed_in") === "true" || localStorage.getItem("cvpilot_mock_signed_in") === "true";
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("cvpilot_auth_user") || localStorage.getItem("cvpilot_mock_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const signIn = (email: string, first: string, last: string) => {
    const trimmedEmail = email.trim();
    const fallbackName = trimmedEmail.split("@")[0] || "User";
    const firstName = first.trim() || fallbackName;
    const lastName = last.trim();
    const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const sessionUser: AuthUser = {
      id: userId,
      firstName,
      lastName,
      imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName + " " + lastName)}`,
      emailAddress: trimmedEmail,
    };
    setUser(sessionUser);
    setIsSignedIn(true);
    localStorage.setItem("cvpilot_auth_signed_in", "true");
    localStorage.setItem("cvpilot_auth_user", JSON.stringify(sessionUser));
  };

  const signOut = () => {
    setUser(null);
    setIsSignedIn(false);
    localStorage.removeItem("cvpilot_auth_signed_in");
    localStorage.removeItem("cvpilot_auth_user");
    localStorage.removeItem("cvpilot_mock_signed_in");
    localStorage.removeItem("cvpilot_mock_user");
  };

  // Detect if we are running inside an iframe (AI Studio preview)
  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;
  const isRealClerkActive = isKeyConfigured && !isInsideIframe;

  // Render real Clerk if configured and NOT in an iframe
  if (isRealClerkActive) {
    return (
      <RealClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        // appearance={{
        //   baseTheme: darkMode ? dark : undefined,
        //   variables: {
        //     colorPrimary: "#171717",
        //   },
        // }}
      >
        <CustomAuthContext.Provider
          value={{
            isSignedIn: false, // overridden by hook
            user: null,
            signIn,
            signOut,
            isRealClerk: true,
            isKeyConfigured: true,
          }}
        >
          {children}
        </CustomAuthContext.Provider>
      </RealClerkProvider>
    );
  }

  // Render simulated auth provider
  return (
    <CustomAuthContext.Provider
      value={{
        isSignedIn,
        user,
        signIn,
        signOut,
        isRealClerk: false,
        isKeyConfigured: isKeyConfigured,
      }}
    >
      {children}
    </CustomAuthContext.Provider>
  );
}

/**
 * Custom SignedIn Component
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isRealClerk, isSignedIn: mockSignedIn } = useCustomAuth();

  if (isRealClerk) {
    return <RealSignedIn>{children}</RealSignedIn>;
  }

  return mockSignedIn ? <>{children}</> : null;
}

/**
 * Custom SignedOut Component
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { isRealClerk, isSignedIn: mockSignedIn } = useCustomAuth();

  if (isRealClerk) {
    return <RealSignedOut>{children}</RealSignedOut>;
  }

  return !mockSignedIn ? <>{children}</> : null;
}

/**
 * Custom SignInButton Component
 */
export function SignInButton({ mode = "modal", children }: { mode?: "modal" | "redirect"; children?: ReactNode }) {
  const { isRealClerk, signIn, isKeyConfigured } = useCustomAuth();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  if (isRealClerk) {
    return <RealSignInButton mode={mode}>{children}</RealSignInButton>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    signIn(email.trim(), firstName.trim(), lastName.trim());
    setShowModal(false);
  };

  return (
    <>
      <div onClick={() => setShowModal(true)} className="cursor-pointer inline-block">
        {children || (
          <button className="px-4 py-2 text-xs font-semibold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors">
            Sign In
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-800 dark:text-neutral-200">
                <LogIn className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Sign in to CVPilot</h4>
              <p className="text-[11px] text-neutral-400">
                Authenticate your session to save analysis history, resumes, and cover letters.
              </p>
            </div>

            {isKeyConfigured && (
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1.5 text-left">
                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                  <strong>Live Clerk is active!</strong> Browsers block live logins inside iframe previews. Open the app in a new tab to use your live account, or use Sandbox Mode below.
                </p>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-900 dark:text-white hover:underline"
                >
                  <span>Open in New Tab &rarr;</span>
                </a>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">First Name</label>
                  <input
                    type="text"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">Last Name</label>
                  <input
                    type="text"
                    placeholder="Your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Access Account
              </button>
            </form>

            <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
              <button
                onClick={() => {
                  setEmail("alex.dev@example.com");
                  setFirstName("Alex");
                  setLastName("Developer");
                  signIn("alex.dev@example.com", "Alex", "Developer");
                  setShowModal(false);
                }}
                className="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 font-semibold"
              >
                ⚡ Fast Demo Login
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Custom UserButton Component
 */
export function UserButton() {
  const { isRealClerk, user: mockUser, signOut: mockSignOut } = useCustomAuth();
  const realUser = isRealClerk ? useRealUser() : null;
  const realClerk = isRealClerk ? useRealClerk() : null;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClose = () => setDropdownOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [dropdownOpen]);

  if (isRealClerk) {
    return <RealUserButton afterSignOutUrl="/" />;
  }

  if (!mockUser) return null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 transition-colors"
      >
        <img
          src={mockUser.imageUrl}
          alt={mockUser.firstName}
          className="w-7 h-7 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
          referrerPolicy="no-referrer"
        />
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 pr-1" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xl space-y-2.5 z-40 animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {mockUser.firstName} {mockUser.lastName}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">{mockUser.emailAddress}</p>
          </div>

          <button
            onClick={() => {
              mockSignOut();
              setDropdownOpen(false);
            }}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/15 font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Header Alert Banner for Developers explaining Clerk configuration
 */
export function ClerkSetupBanner() {
  const { isKeyConfigured } = useCustomAuth();

  if (isKeyConfigured) return null;

  return (
    <div className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/15 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs leading-none">
          <Key className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Clerk Preview Sandbox Mode:</strong> Provide <code>VITE_CLERK_PUBLISHABLE_KEY</code> in environment settings to enable live auth.
          </span>
        </div>
        <div className="text-[9px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md self-start sm:self-center border border-amber-500/20">
          Sandbox Enabled
        </div>
      </div>
    </div>
  );
}

/**
 * Universal useUser wrapper that works with both real and mock auth
 */
export function useUser() {
  const { isRealClerk, user: mockUser, isSignedIn: mockIsSignedIn } = useCustomAuth();
  const realClerkUser = isRealClerk ? useRealUser() : null;

  if (isRealClerk) {
    const isLoaded = realClerkUser ? realClerkUser.isLoaded : false;
    const isSignedIn = realClerkUser ? realClerkUser.isSignedIn : false;
    const user = realClerkUser ? realClerkUser.user : null;

    return {
      isLoaded,
      isSignedIn,
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            emailAddress: user.primaryEmailAddress?.emailAddress || "",
          }
        : null,
    };
  }

  return {
    isLoaded: true,
    isSignedIn: mockIsSignedIn,
    user: mockUser,
  };
}
