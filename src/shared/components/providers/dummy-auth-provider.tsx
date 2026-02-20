'use client';

import { createContext, useContext, useState } from 'react';

// Define the User interface
export interface User {
  id: string;
  role: string;
  name: string;
}

// Define the context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function DummyAuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize synchronously to support SSR and avoid hydration mismatch if env vars are consistent.
  const [user] = useState<User | null>(() => {
    return process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
      ? {
          id: '1',
          role: 'SEARCHER',
          name: 'Jane Analyst',
        }
      : null;
  });
  const [loading] = useState(false);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider (or DummyAuthProvider)');
  }
  return context;
}
