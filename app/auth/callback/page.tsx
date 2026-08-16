"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../supabase-browser";

export default function AuthCallback() {
  const [message, setMessage] = useState("Completing your sign-in…");

  useEffect(() => {
    const completeSignIn = async () => {
      const supabase = getSupabaseBrowserClient();
      const complete = async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) return setMessage(error.message);
        if (data.session) window.location.replace("/");
      };
      void complete();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) window.location.replace("/");
      });
      return () => subscription.unsubscribe();
    };

    let unsubscribe: (() => void) | undefined;
    void completeSignIn().then((cleanup) => {
      unsubscribe = cleanup;
    }).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Authentication could not be completed.");
    });

    return () => unsubscribe?.();
  }, []);

  return <main className="auth-shell"><p className="auth-loading">{message}</p></main>;
}
