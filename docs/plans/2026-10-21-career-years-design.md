# Career answers and season years

Approved October 21, 2026.

Career always uses buzz-in and typed answers. Setup and lobby must describe that behavior, and saved Career settings normalize answerMode to freetext.

Add careerShowYears to room settings, defaulting to true. Missing values in older rooms mean true. Setup offers Show years and Hide years using the existing segmented controls. Hidden years become Season 1, Season 2, etc., while chronological reveal timing remains unchanged. Host and player displays use the same room setting. Actual years appear when the round ends.

Career offers Era as a shared hint only when years are hidden and hints are enabled. It keeps the existing hint meaning: the decade of the player's first season. Team and Position remain available. Classic hints remain unchanged. Reject redundant Career Era hint requests in the room mutation as well as hiding the control.

Implementation: persist the setting through setup, defaults and room storage; update shared reveal and hint components; wire host/player pages and lobby. Verify hidden versus visible year rendering, hint availability/counts, settings persistence, older-room defaults, and existing career/rematch behavior with production-module tests and TypeScript.
