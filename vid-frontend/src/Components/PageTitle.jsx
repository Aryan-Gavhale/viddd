import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { translateUICopy } from "../i18n/uiCopyTranslations";

export default function PageTitle({ title, description }) {
  const { i18n, t } = useTranslation();
  const translatedTitle = title ? translateUICopy(title, i18n.language) : null;
  const fullTitle = translatedTitle
    ? `${translatedTitle} | Vidlancing`
    : t("routes.defaultTitle", "Vidlancing — Video Freelancing Marketplace");
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}
