"use client";

import { generateUsername } from "@/lib/username";
import { STORAGE_KEY_USERNAME } from "@/lib/username";
import { useEffect, useState } from "react";

export const useUsername = () => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY_USERNAME);

      if (stored) {
        setUsername(stored);
        return;
      }

      const generated = generateUsername();
      localStorage.setItem(STORAGE_KEY_USERNAME, generated);
      setUsername(generated);
    };

    main();
  }, []);

  return { username };
};
