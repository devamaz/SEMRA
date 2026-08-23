# Hijri date computed from the embedded Umm al-Qura table, not Intl

The landing page shows today's Hijri date. `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` is unreliable: Android WebView doesn't implement `islamic-umalqura` and emits garbage like "March 10, 1448 BC AH" (Chromium issue 40856332), and modern ICU already includes the era in the output, so appending " AH" produced "Rabiʻ I 10, 1448 AH AH". `shared/hijri.js` therefore converts directly using the official Umm al-Qura lunation table (1356–1500 AH), derived from ICU's own data so results match what Intl produced on working platforms exactly (verified: 51,383 days, zero mismatches). Callers must not append an era — `formatHijriDate` returns it.

**Why:** one deterministic source, identical on every platform, with no dependency on how each browser's ICU renders Islamic calendars.

**Rejected:** sanitising the Intl output (only fixes the duplicate era, not Android's wrong month names); the tabular Islamic calendar (differs from Umm al-Qura by up to a month).
