# Kansai Trip Migration Report

Generated at: 2026-09-23T05:58:27.564Z
Input Hash: 4eaa4673
Plan Version ID: plan-version:kansai-2026

## Summary

- Total Legacy Events: 49
- Total Legacy Todos: 7
- Coordinate Bearing Count: 43
- Missing Coordinate IDs: 6
  - seizen, bajitofu, kyorinsen, kanei, rakukanki, quattro
- Day Projections: 2026-09-25, 2026-09-26, 2026-09-27, 2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01

## Provenance

| Legacy ID | Kind | New IDs | Action | Note |
|---|---|---|---|---|
| icn-depart | event | plan-item:icn-depart | kept | Type mapped from 'flight' to 'flight'. |
| kix-arrive | event | plan-item:kix-arrive | kept | Type mapped from 'arrival' to 'transport'. |
| kamu-kix | event | plan-item:kamu-kix | kept | Type mapped from 'food' to 'meal'. Price preserved as text: '약 ¥890'. |
| to-osaka | event | plan-item:to-osaka | kept | Type mapped from 'transit' to 'transport'. |
| sarasa-checkin | event | plan-item:sarasa-checkin | kept | Type mapped from 'hotel' to 'lodging'. Hotel check-in event represented as single lodging PlanItem with schedule period, not duplicated per day. |
| late-snack | event | plan-item:late-snack | kept | Type mapped from 'flex' to 'freeTime'. |
| breakfast-27 | event | plan-item:breakfast-27 | kept | Type mapped from 'food' to 'meal'. |
| to-umeda | event | plan-item:to-umeda | kept | Type mapped from 'transit' to 'transport'. |
| aburiya | event | plan-item:aburiya | kept | Type mapped from 'food' to 'meal'. Reservation ambiguous: '예약 예정'. No Booking created, original text preserved in BookingPolicy.note. Price preserved as text: '¥5,368'. |
| to-umeda-sky | event | plan-item:to-umeda-sky | kept | Type mapped from 'transit' to 'transport'. |
| umeda-sky | event | plan-item:umeda-sky | kept | Type mapped from 'sight' to 'attraction'. |
| to-osaka-castle | event | plan-item:to-osaka-castle | kept | Type mapped from 'transit' to 'transport'. |
| osaka-castle | event | plan-item:osaka-castle | kept | Type mapped from 'sight' to 'attraction'. |
| to-shinsekai | event | plan-item:to-shinsekai | kept | Type mapped from 'transit' to 'transport'. |
| shinsekai | event | plan-item:shinsekai | kept | Type mapped from 'sight' to 'attraction'. |
| kushikatsu-snack | event | plan-item:kushikatsu-snack | kept | Type mapped from 'food' to 'meal'. |
| to-dotonbori | event | plan-item:to-dotonbori | kept | Type mapped from 'transit' to 'transport'. |
| dotonbori | event | plan-item:dotonbori | kept | Type mapped from 'sight' to 'attraction'. |
| checkout-osaka | event | plan-item:checkout-osaka | kept | Type mapped from 'transit' to 'transport'. |
| nara-station | event | plan-item:nara-station | kept | Type mapped from 'task' to 'task'. |
| nara-walk | event | plan-item:nara-walk | kept | Type mapped from 'sight' to 'attraction'. |
| seizen | event | plan-item:seizen | kept | Type mapped from 'food' to 'meal'. Reservation ambiguous: '예약 추천'. No Booking created, original text preserved in BookingPolicy.note. Price preserved as text: '약 ¥3,200'. Coordinates missing, no Place created. |
| naramachi | event | plan-item:naramachi | kept | Type mapped from 'sight' to 'attraction'. |
| to-kyoto | event | plan-item:to-kyoto | kept | Type mapped from 'transit' to 'transport'. |
| smile-checkin | event | plan-item:smile-checkin | kept | Type mapped from 'hotel' to 'lodging'. Hotel check-in event represented as single lodging PlanItem with schedule period, not duplicated per day. |
| bajitofu | event | plan-item:bajitofu | kept | Type mapped from 'food' to 'meal'. Reservation ambiguous: '미예약 · 전화예약 필요'. No Booking created, original text preserved in BookingPolicy.note. Price preserved as text: '¥2,500~3,500'. Coordinates missing, no Place created. |
| breakfast-29 | event | plan-item:breakfast-29 | kept | Type mapped from 'food' to 'meal'. |
| to-arashiyama | event | plan-item:to-arashiyama | kept | Type mapped from 'transit' to 'transport'. |
| arashiyama | event | plan-item:arashiyama | kept | Type mapped from 'sight' to 'attraction'. |
| kyorinsen | event | plan-item:kyorinsen | kept | Type mapped from 'food' to 'meal'. Reservation ambiguous: '예약 추천'. No Booking created, original text preserved in BookingPolicy.note. Price preserved as text: '¥3,500'. Coordinates missing, no Place created. |
| kyoto-afternoon | event | plan-item:kyoto-afternoon | kept | Type mapped from 'flex' to 'freeTime'. |
| kanei | event | plan-item:kanei | kept | Type mapped from 'food' to 'meal'. Reservation ambiguous: '미예약 · 전화예약 필요'. No Booking created, original text preserved in BookingPolicy.note. Price preserved as text: '약 ¥1,900'. Coordinates missing, no Place created. |
| dessert-29 | event | plan-item:dessert-29 | kept | Type mapped from 'flex' to 'freeTime'. |
| checkout-kyoto | event | plan-item:checkout-kyoto | kept | Type mapped from 'task' to 'task'. |
| fushimi | event | plan-item:fushimi | kept | Type mapped from 'sight' to 'attraction'. |
| tofukuji | event | plan-item:tofukuji | kept | Type mapped from 'sight' to 'attraction'. |
| spice | event | plan-item:spice | kept | Type mapped from 'food' to 'meal'. Price preserved as text: '¥1,400~1,600'. |
| pickup-bag | event | plan-item:pickup-bag | kept | Type mapped from 'task' to 'task'. |
| to-kobe | event | plan-item:to-kobe | kept | Type mapped from 'transit' to 'transport'. |
| kobe-checkin | event | plan-item:kobe-checkin | kept | Type mapped from 'hotel' to 'lodging'. Hotel check-in event represented as single lodging PlanItem with schedule period, not duplicated per day. |
| kobe-waterfront | event | plan-item:kobe-waterfront | kept | Type mapped from 'sight' to 'attraction'. |
| rakukanki | event | plan-item:rakukanki, booking:rakukanki | kept | Type mapped from 'food' to 'meal'. Reservation confirmed: '예약 확정'. Booking created with id 'booking:rakukanki'. Price preserved as text: '약 ¥2,880'. Coordinates missing, no Place created. |
| kobe-night | event | plan-item:kobe-night | kept | Type mapped from 'sight' to 'attraction'. |
| kobe-morning | event | plan-item:kobe-morning | kept | Type mapped from 'sight' to 'attraction'. |
| checkout-kobe | event | plan-item:checkout-kobe | kept | Type mapped from 'task' to 'task'. |
| quattro | event | plan-item:quattro | kept | Type mapped from 'food' to 'meal'. Price preserved as text: '약 ¥1,850'. Coordinates missing, no Place created. |
| souvenir | event | plan-item:souvenir | kept | Type mapped from 'task' to 'task'. |
| to-ukb | event | plan-item:to-ukb | kept | Type mapped from 'transit' to 'transport'. |
| ukb-depart | event | plan-item:ukb-depart | kept | Type mapped from 'flight' to 'flight'. |
| r1 | todo | task:r1 | kept | Todo mapped to Task with id 'task:r1'. Priority: 1. |
| r2 | todo | task:r2 | kept | Todo mapped to Task with id 'task:r2'. Priority: 2. |
| r3 | todo | task:r3 | kept | Todo mapped to Task with id 'task:r3'. Priority: 3. |
| r4 | todo | task:r4 | kept | Todo mapped to Task with id 'task:r4'. Priority: 4. |
| r5 | todo | task:r5 | kept | Todo mapped to Task with id 'task:r5'. Priority: 5. |
| pass | todo | task:pass | kept | Todo mapped to Task with id 'task:pass'. Priority: 2. |
| fresh | todo | task:fresh | kept | Todo mapped to Task with id 'task:fresh'. Priority: 1. |

## Unresolved

None.

## ID Map

| Legacy ID | New ID |
|---|---|
| icn-depart | plan-item:icn-depart |
| kix-arrive | plan-item:kix-arrive |
| kamu-kix | plan-item:kamu-kix |
| to-osaka | plan-item:to-osaka |
| sarasa-checkin | plan-item:sarasa-checkin |
| late-snack | plan-item:late-snack |
| breakfast-27 | plan-item:breakfast-27 |
| to-umeda | plan-item:to-umeda |
| aburiya | plan-item:aburiya |
| to-umeda-sky | plan-item:to-umeda-sky |
| umeda-sky | plan-item:umeda-sky |
| to-osaka-castle | plan-item:to-osaka-castle |
| osaka-castle | plan-item:osaka-castle |
| to-shinsekai | plan-item:to-shinsekai |
| shinsekai | plan-item:shinsekai |
| kushikatsu-snack | plan-item:kushikatsu-snack |
| to-dotonbori | plan-item:to-dotonbori |
| dotonbori | plan-item:dotonbori |
| checkout-osaka | plan-item:checkout-osaka |
| nara-station | plan-item:nara-station |
| nara-walk | plan-item:nara-walk |
| seizen | plan-item:seizen |
| naramachi | plan-item:naramachi |
| to-kyoto | plan-item:to-kyoto |
| smile-checkin | plan-item:smile-checkin |
| bajitofu | plan-item:bajitofu |
| breakfast-29 | plan-item:breakfast-29 |
| to-arashiyama | plan-item:to-arashiyama |
| arashiyama | plan-item:arashiyama |
| kyorinsen | plan-item:kyorinsen |
| kyoto-afternoon | plan-item:kyoto-afternoon |
| kanei | plan-item:kanei |
| dessert-29 | plan-item:dessert-29 |
| checkout-kyoto | plan-item:checkout-kyoto |
| fushimi | plan-item:fushimi |
| tofukuji | plan-item:tofukuji |
| spice | plan-item:spice |
| pickup-bag | plan-item:pickup-bag |
| to-kobe | plan-item:to-kobe |
| kobe-checkin | plan-item:kobe-checkin |
| kobe-waterfront | plan-item:kobe-waterfront |
| rakukanki | plan-item:rakukanki |
| kobe-night | plan-item:kobe-night |
| kobe-morning | plan-item:kobe-morning |
| checkout-kobe | plan-item:checkout-kobe |
| quattro | plan-item:quattro |
| souvenir | plan-item:souvenir |
| to-ukb | plan-item:to-ukb |
| ukb-depart | plan-item:ukb-depart |
| r1 | task:r1 |
| r2 | task:r2 |
| r3 | task:r3 |
| r4 | task:r4 |
| r5 | task:r5 |
| pass | task:pass |
| fresh | task:fresh |
