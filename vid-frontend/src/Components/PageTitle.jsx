import { Helmet } from "react-helmet-async";

export default function PageTitle({ title, description }) {
  const fullTitle = title ? `${title} | Vidlancing` : "Vidlancing — Video Freelancing Marketplace";
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}
