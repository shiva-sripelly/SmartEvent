import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function ReferralPage() {
  const { t } = useLanguage();
  const [referral, setReferral] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    API.get("/auth/referral")
      .then((res) => setReferral(res.data))
      .catch(() => setMessage(t("referralLoadFailed")));
  }, []);

  const shareText = useMemo(() => {
    if (!referral?.referral_code) return "";
    return t("referralShareText", { code: referral.referral_code });
  }, [referral, t]);

  const copyReferralCode = async () => {
    if (!referral?.referral_code) return;

    try {
      await navigator.clipboard.writeText(referral.referral_code);
      setMessage(t("referralCopied"));
    } catch {
      setMessage(t("referralCopyFailed"));
    }
  };

  const shareReferralCode = async () => {
    if (!shareText) return;

    if (navigator.share) {
      await navigator.share({
        title: "SmartEvent",
        text: shareText,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setMessage(t("referralShareCopied"));
    } catch {
      setMessage(t("referralCopyFailed"));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2>{t("referralSystem")}</h2>
          <p className="subtle-text">{t("referralSubtitle")}</p>
        </div>
      </div>

      <section className="overview-card">
        <h3>{t("yourReferralCode")}</h3>
        <div className="summary-block">
          <div>
            <span>{t("referralCode")}</span>
            <strong>{referral?.referral_code || t("loading")}</strong>
          </div>
          <div>
            <span>{t("successfulReferrals")}</span>
            <strong>{referral?.referral_count || 0}</strong>
          </div>
          <div>
            <span>{t("referralPoints")}</span>
            <strong>{referral?.reward_points_from_referrals || 0}</strong>
          </div>
        </div>

        <p className="subtle-text">
          {t("referralHelp", {
            points: referral?.points_per_referral || 20,
          })}
        </p>

        <div className="payment-actions">
          <button className="download-btn" type="button" onClick={copyReferralCode}>
            {t("copyReferralCode")}
          </button>
          <button className="download-btn secondary" type="button" onClick={shareReferralCode}>
            {t("shareReferralCode")}
          </button>
        </div>

        {message && <div className="success-message">{message}</div>}
      </section>
    </div>
  );
}
