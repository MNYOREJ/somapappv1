
SoMAp Preform One — v2.1

This package contains a working Preform One module for SoMAp, using:
- Firebase Realtime Database (config already set to your project)
- Cloudinary unsigned uploads (cloud name set, unsigned preset expected: somap_unsigned)
- TailwindCSS for styling

Folder: preformonehtml/

Files of interest:
- prefonecommon.js        (shared Firebase + Cloudinary helpers; already populated with your Firebase config)
- prefonedashboard.html   (main dashboard — links to the module pages)
- prefoneadmission.html   (admission form, uploads photo to Cloudinary, stores data in RTDB)
- prefoneattendance.html  (daily attendance marking)
- prefonefinance.html     (finance overview + record payment)
- prefonescoresheet.html  (scores input and save)
- prefoneacademic.html    (academic overview)
- preoneexpenses.html     (record school expenses)
- prefonebooks.html       (upload and list books)
- prefoneparent.html      (simple parent view)
- prefonelessonplan.html  (lesson plan input)
- prefoneclassjournal.html (class journal with proof image uploads)
- prefonegenerateid.html  (generate student IDs)
- prefoneshiftedkid.html  (mark/track shifted kids)

IMPORTANT NOTES BEFORE YOU RUN:
1. The Firebase config in prefonecommon.js has been inserted using the values you pasted earlier.
2. Cloudinary client-side uploads use an UNSIGNED upload preset named `somap_unsigned`. Make sure this preset exists in your Cloudinary dashboard and allows uploads to the folder `preformone` (or modify the preset name in prefonecommon.js).
3. Authentication (staff/parents) UI is not pre-created; create users via the Firebase Console or we can add an auth flow in a follow-up. Pages currently write to the DB without auth for ease of testing. For production, enable Firebase Auth rules and require sign-in.
4. To deploy: host the entire `somapappv1` contents on Firebase Hosting / Netlify / your domain. Realtime DB rules may be set to your desired security level.

If you want, I can:
- Add enforced Firebase Auth flows for staff/parents.
- Lock DB rules and show how to create admin accounts.
- Replace unsigned Cloudinary upload with signed server-side uploads.
