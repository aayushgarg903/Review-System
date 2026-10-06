# QR Card Specifications & Architecture

## Overview
The product now utilizes a **Physical QR Feedback Card** as the primary entry point for customers. The physical card acts purely as a medium to bridge the physical world to the web application.

**Important**: We are intentionally **NOT** implementing NFC hardware, APIs, or database support at this stage.

## Architecture Data Model (V1)
For V1, the data model remains as simple as possible. No new database tables are required for physical cards. 

The relationship is entirely stateless and URL-driven:
`Physical Card` → `QR Code` → `https://<domain>/r/<slug>` → `clients` table (via `slug`)

### Example:
- A physical card is printed for Royal Salon.
- The QR code encodes `https://<domain>/r/royal-salon`.
- The Next.js route `/r/[slug]` resolves the slug to the client.
- Multiple physical cards can be printed with the exact same QR code pointing to the same business. The card itself has no database identity.

## QR Code Generation
Currently, the project does **NOT** contain a QR-code generation dependency. 
To adhere to the principle of "do not add dependencies unless actually required", we will not install one right now.

**The smallest safe implementation:**
Since physical cards are printed assets, the QR code generation should ultimately yield a high-quality printable asset (e.g., SVG or high-res PNG). 
- In the future, this can be done client-side in the admin dashboard (e.g., using a lightweight library like `qrcode` or `react-qr-code`) so the owner can download it.
- Alternatively, we can use a reliable external API (like `api.qrserver.com`) to display it without adding bundle weight, or simply provide the URL to the business owner to use with their preferred printing vendor.

## Physical Card Specifications

### Form Factor & Dimensions
- **Size**: Standard credit card size (85.60 mm × 53.98 mm) or standard business card size (3.5" x 2").
- **Material Options**: Thick cardstock (matte finish to reduce glare for scanners), PVC plastic, or acrylic for premium durability on tabletops.

### QR Code Placement & Design
- **Readability Requirements**: Must be at least 1 inch x 1 inch (2.5 cm x 2.5 cm) for easy scanning.
- **Quiet Zone**: Must have a clear margin (quiet zone) of at least 4 modules (blocks) around the QR code to ensure scanners can isolate it.
- **Placement**: Centered or prominently aligned. Avoid placing text too close to the QR code edges.
- **Branding**: Business Logo and/or Name should be placed clearly above or next to the QR code.

### Customer-Facing Copy
The copy must remain neutral and fair to comply with our design constraints. DO NOT use manipulative review language (e.g., "Give us 5 stars" or "Happy? Review us").

**Recommended Copy:**
> "How was your experience?"
> "Scan to share your experience."

### Quality Assurance
- **Requirement**: EVERY batch of printed cards must be tested using a real phone (iOS and Android default camera apps) before delivery to the business to ensure the QR code resolves quickly and correctly.

## Business Onboarding Workflow
The complete onboarding workflow for a new business utilizing physical cards:

1. **New Business**: A business agrees to use the platform.
2. **Create Client**: Admin creates the client in the Supabase database (or via the admin script).
3. **Configure Google Link**: The correct `google_review_link` is saved to the client record.
4. **Verify Business Slug**: Ensure the slug (e.g., `royal-salon`) correctly maps to the client.
5. **Generate QR Destination**: The destination URL is formulated: `https://<domain>/r/royal-salon`.
6. **Create/Print Physical Card**: The QR code is generated for the destination URL and printed on the physical cards.
7. **Scan Card with Real Phone**: QA step to verify the printed card works.
8. **Verify Landing Page**: Ensure the scan opens the correct branded landing page.
9. **Verify Google Review Link**: Ensure clicking the Google option routes correctly.
10. **Verify Private Feedback**: Submit a test private feedback.
11. **Verify Owner Notification**: Ensure the owner dashboard/email receives the feedback.
12. **Deliver Card to Business**: Hand over the physical cards to the business owner.

## Future NFC Compatibility
While NFC is strictly NOT implemented in V1, the architecture supports a seamless upgrade path.

**QR Architecture (Current):**
`Physical Card` → `QR Code` → `https://<domain>/r/<slug>`

**NFC Architecture (Future):**
`Physical Card` → `NFC NDEF Tag` → `https://<domain>/r/<slug>`

Both methods will eventually lead to the exact same web system. No new database tables, APIs, or components will be required for the software to support NFC; it simply requires writing the URL to the NFC tag's NDEF record during the card manufacturing process.
