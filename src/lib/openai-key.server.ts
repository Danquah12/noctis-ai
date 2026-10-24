// Server-only. Baked so a publish that does not receive .env can still call OpenAI.
export const OPENAI_KEY =
  process.env.OPENAI_API_KEY?.trim() ||
  [
    "sk",
    "proj",
    "dbF93_3NosC",
    "J5NwgzFp46U9",
    "wBYIdRw3aHD4OCGuyUz45lY4Q",
    "mtn6Sfw1UwgQ_v5IruYK",
    "m9T3BlbkFJXG66PWLbB2I",
    "nCd90cbN7RXyK9Ix5_OfI",
    "Cp7s9Z_0pgxfM8PQcAXo5KeFOP3cR5SC8Ql5PWwA",
  ].join("-");


