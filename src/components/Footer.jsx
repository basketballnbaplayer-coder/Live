import { useState } from "react";
import LegalModal from "./legal/LegalModal";
import { PRIVACY_POLICY_TEXT } from "./legal/privacyPolicyText";
import { TERMS_TEXT } from "./legal/termsText";

export default function Footer({ t, navigate }) {
  const [legalModal, setLegalModal] = useState(null);

  return (
    <>
      <div className={`px-5 py-6 flex flex-wrap gap-x-4 gap-y-1 text-xs ${t.sub2} border-t ${t.border} mt-4`}>
        <span>© {new Date().getFullYear()} StreamHub</span>
        <button onClick={() => setLegalModal("privacy")} className="hover:underline">Privacy Policy</button>
        <button onClick={() => setLegalModal("terms")} className="hover:underline">Terms of Service</button>
        <button onClick={() => navigate("support")} className="hover:underline">Support</button>
      </div>
      {legalModal === "privacy" && <LegalModal t={t} title="Privacy Policy" markdown={PRIVACY_POLICY_TEXT} onClose={() => setLegalModal(null)} />}
      {legalModal === "terms" && <LegalModal t={t} title="Terms of Service" markdown={TERMS_TEXT} onClose={() => setLegalModal(null)} />}
    </>
  );
}
