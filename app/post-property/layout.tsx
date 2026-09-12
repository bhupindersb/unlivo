import type { ReactNode } from "react";
import PostPropertyValidation from "../../components/post-property-validation";

export default function PostPropertyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PostPropertyValidation />
      <style>{`
        form button[type="submit"] {
          white-space: nowrap;
          min-width: 150px;
        }
      `}</style>
    </>
  );
}
