import type { ReactNode } from "react";
import PostPropertyValidation from "../../components/post-property-validation";

export default function PostPropertyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PostPropertyValidation />
      <style>{`
        form button[type="submit"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: 0 0 190px !important;
          width: 190px !important;
          min-width: 190px !important;
          max-width: 190px !important;
          white-space: nowrap !important;
          overflow: visible !important;
        }

        @media (max-width: 640px) {
          form button[type="submit"] {
            flex-basis: 100% !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </>
  );
}
