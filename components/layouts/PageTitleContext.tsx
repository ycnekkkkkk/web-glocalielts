"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

interface PageTitleContextValue {
  title: string;
  setTitle: (t: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: "",
  setTitle: () => {},
});

export function usePageTitle() {
  return useContext(PageTitleContext);
}

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}
