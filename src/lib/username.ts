import { nanoid } from "nanoid";

const ANIMALS = [
  "lobo",
  "tigre",
  "leon",
  "leopardo",
  "oso",
  "zorro",
  "nutria",
  "mapache",
  "murcielago",
  "rata",
  "conejo",
  "gato",
  "dragón",
];

export const STORAGE_KEY_USERNAME = "chat_username";

export const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${word}-anónimo-${nanoid(5)}`;
};
