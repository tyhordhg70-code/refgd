import { permanentRedirect } from "next/navigation";

/*
 * The old /vouches page has been superseded by the live /community hub
 * (Client Testimonials, BUY4U Vouches, Announcements + Group Chat). Keep the
 * route as a permanent (308) redirect so existing links / bookmarks land on
 * the new experience.
 */
export const dynamic = "force-dynamic";

export default function VouchesPage() {
  permanentRedirect("/community");
}
