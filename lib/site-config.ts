export const SITE_CONFIG = {
  operatorName: "REPLACE_ME",
  contactEmail: "REPLACE_ME"
};

if (process.env.NODE_ENV === "production") {
  if (SITE_CONFIG.operatorName === "REPLACE_ME" || SITE_CONFIG.contactEmail === "REPLACE_ME") {
    console.warn("WARNING: You are building for production but have not updated SITE_CONFIG with real values in lib/site-config.ts");
  }
}
